import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, X, Loader2, Keyboard, Check, AlertCircle, HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../lib/store';
import { getVertical } from '../lib/vertical';
import { useVoiceAssistant, VoiceCommandResult } from '../services/voiceService';

// Onde o reconhecimento de voz do navegador funciona. No iPhone ele só
// começa dentro de um toque do usuário, e no app instalado na tela inicial
// ele não funciona de jeito nenhum — o iOS não libera a API nesse modo. Era
// o caso em produção: o assistente abria, mas nenhuma fala chegava ao
// servidor.
const ReconhecimentoDeVoz: any = typeof window !== 'undefined'
  ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  : undefined;
const EH_IOS = typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
const APP_INSTALADO = typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true);
const VOZ_DISPONIVEL = !!ReconhecimentoDeVoz && !(EH_IOS && APP_INSTALADO);
// Começar a ouvir sozinho ao abrir só onde não exige toque (fora do iPhone).
const INICIAR_SOZINHO = VOZ_DISPONIVEL && !EH_IOS;

/**
 * Assistente de voz. Uma coisa de cada vez: ouvir, entender, mostrar o que
 * aconteceu. Abre como folha na metade de baixo, por cima da página atual —
 * a tela inteira escondia a Agenda justamente quando a pessoa agendava por
 * voz. A versão anterior a esta empilhava título, card de rotina do dia,
 * doze sugestões e uma onda decorativa, e empurrava o microfone para fora.
 */
export function VoiceAssistant() {
  const isVoiceActive = useStore(state => state.isVoiceActive);
  const setIsVoiceActive = useStore(state => state.setIsVoiceActive);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [result, setResult] = useState<VoiceCommandResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const recognitionRef = React.useRef<any>(null);
  // Campo de texto: funciona em qualquer aparelho, e no iPhone o microfone
  // do próprio teclado dita o comando mesmo no app instalado.
  const campoRef = React.useRef<HTMLInputElement>(null);
  // Fechamento automático depois do resultado. Cancelado se a pessoa volta a
  // falar ou começa a digitar, para a tela não sumir no meio do comando.
  const fechamentoRef = React.useRef<ReturnType<typeof setTimeout>>();
  const [digitado, setDigitado] = useState('');
  // Cada comando ganha um número. Fechar o assistente avança o contador, e
  // tudo que chega de um comando antigo é descartado. Um booleano de
  // "cancelado" não bastava: reabrir o assistente o zerava, e a resposta do
  // comando fechado ainda era gravada — além de fechar a sessão nova.
  const geracaoRef = React.useRef(0);
  // Depois de um resultado ou erro final, o microfone não religa sozinho: a
  // religação apagava a mensagem em menos de um segundo, antes de dar para
  // ler "Assistente ocupado" ou "Sessão expirada".
  const [pausado, setPausado] = useState(false);
  const { parseCommand, executeCommand } = useVoiceAssistant();

  // Três exemplos, conforme o tipo de negócio. Tocar num deles preenche o
  // campo — antes eram doze etiquetas fixas, que só ocupavam espaço.
  const vertical = getVertical(useStore(state => state.settings).businessType);
  const exemplos = vertical.hasScheduling
    ? ['Agendar Ana amanhã às 14h', 'Registrar venda de 200 reais', 'Resumo financeiro do mês']
    : ['Gastei 50 reais no mercado', 'Recebi 200 reais', 'Resumo financeiro do mês'];

  useEffect(() => {
    if (!isVoiceActive) setPausado(false);
    if (isVoiceActive && INICIAR_SOZINHO && !isListening && !isProcessing && !pausado) {
      startListening();
    }
  }, [isVoiceActive, isProcessing, pausado]);

  const startListening = () => {
    // Sem reconhecimento aqui (app instalado no iPhone, Firefox), o assistente
    // não fecha: vai para o campo de texto, onde o microfone do teclado
    // também dita o comando.
    if (!VOZ_DISPONIVEL) {
      campoRef.current?.focus();
      return;
    }
    clearTimeout(fechamentoRef.current);
    setPausado(false);

    const recognition = new ReconhecimentoDeVoz();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
      setInterim('');
      // A pergunta de complemento ("Faltou o horário...") continua na tela
      // enquanto a pessoa responde.
      setResult(prev => (prev?.status === 'incomplete' ? prev : null));
    };

    // Microfone negado, silêncio ou rede: sem este tratamento a tela ficava
    // parada sem explicar nada e sem forma de tentar de novo.
    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event?.error === 'aborted') return;
      setPausado(true);
      const recados: Record<string, string> = {
        'not-allowed': 'Permita o uso do microfone nas configurações do navegador.',
        'service-not-allowed': 'Permita o uso do microfone nas configurações do navegador.',
        'no-speech': 'Não ouvi nada. Toque no microfone para falar de novo.',
        'audio-capture': 'Nenhum microfone encontrado neste aparelho.',
        'network': 'Sem conexão para reconhecer a voz. Verifique a internet.',
      };
      const negado = event?.error === 'not-allowed' || event?.error === 'service-not-allowed';
      setResult({
        action: 'unknown',
        message: EH_IOS && negado
          ? 'O iPhone não liberou o microfone aqui. Digite o comando ou use o microfone do teclado.'
          : recados[event?.error] ?? 'Não consegui ouvir. Toque no microfone para tentar de novo.',
        status: 'complete',
      });
      if (EH_IOS && negado) campoRef.current?.focus();
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }
      if (interimTranscript) setInterim(interimTranscript);
      if (finalTranscript) {
        setTranscript(finalTranscript);
        handleFinalTranscript(finalTranscript);
      }
    };

    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  /** Mostra o resultado por alguns segundos e fecha — se ainda for o mesmo comando. */
  const fecharDepois = (geracao: number) => {
    setIsProcessing(false);
    setPausado(true);
    clearTimeout(fechamentoRef.current);
    fechamentoRef.current = setTimeout(() => {
      if (geracao !== geracaoRef.current) return;
      setIsVoiceActive(false);
      setResult(null);
      setTranscript('');
      setInterim('');
    }, 3500);
  };

  const handleFinalTranscript = async (text: string) => {
    const geracao = ++geracaoRef.current;
    setIsProcessing(true);
    const combinedText = lastCommand ? `${lastCommand} ${text}` : text;

    try {
      const res = await parseCommand(combinedText);
      if (geracao !== geracaoRef.current) return;
      setResult(res);

      if (res.status === 'incomplete') {
        setLastCommand(combinedText);
        setIsProcessing(false);
        return;
      }

      if (res.action === 'unknown') {
        setLastCommand('');
        fecharDepois(geracao);
        return;
      }

      let resultado: Awaited<ReturnType<typeof executeCommand>> = null;
      try {
        // A frase do Gemini é o que ele entendeu; o que de fato aconteceu
        // vem daqui. Cliente não encontrado, horário ocupado, nome ambíguo.
        resultado = await executeCommand(res);
      } catch {
        if (geracao !== geracaoRef.current) return;
        setResult({ ...res, action: 'unknown', message: 'Não consegui salvar. Verifique a conexão e tente de novo.' });
        setLastCommand('');
        fecharDepois(geracao);
        return;
      }
      if (geracao !== geracaoRef.current) return;

      // Pergunta ("qual Ana?", "qual horário?") mantém a conversa aberta: a
      // resposta, falada ou digitada, é somada ao comando original.
      if (resultado?.pergunta) {
        setResult({ ...res, message: resultado.mensagem, status: 'incomplete' });
        setLastCommand(combinedText);
        setIsProcessing(false);
        return;
      }

      if (resultado) setResult({ ...res, message: resultado.mensagem });
      setLastCommand('');
      fecharDepois(geracao);
    } catch {
      if (geracao !== geracaoRef.current) return;
      setResult({ action: 'unknown', message: 'Algo deu errado. Tente de novo.', status: 'complete' });
      setLastCommand('');
      fecharDepois(geracao);
    }
  };

  const stopAssistant = () => {
    geracaoRef.current++;
    clearTimeout(fechamentoRef.current);
    recognitionRef.current?.stop();
    setIsVoiceActive(false);
    setIsListening(false);
    setIsProcessing(false);
    setLastCommand('');
    setResult(null);
    setTranscript('');
    setInterim('');
    setDigitado('');
  };

  const tocarMicrofone = () => {
    if (!VOZ_DISPONIVEL) { campoRef.current?.focus(); return; }
    if (isListening) { recognitionRef.current?.stop(); return; }
    if (!isProcessing) startListening();
  };

  const enviarDigitado = (e: React.FormEvent) => {
    e.preventDefault();
    const texto = digitado.trim();
    if (!texto || isProcessing) return;
    recognitionRef.current?.abort?.();
    setDigitado('');
    setInterim('');
    setTranscript(texto);
    handleFinalTranscript(texto);
  };

  const usarExemplo = (exemplo: string) => {
    setDigitado(exemplo);
    campoRef.current?.focus();
  };

  // Uma frase só diz o estado da conversa.
  const estado = isProcessing
    ? 'Entendendo...'
    : isListening
      ? 'Ouvindo...'
      : result?.status === 'incomplete'
        ? 'Responda falando ou digitando'
        : VOZ_DISPONIVEL
          ? 'Toque no microfone para falar'
          : 'Digite ou use o microfone do teclado';

  const falado = interim || transcript;
  const tipoResultado = !result ? null
    : result.action === 'unknown' ? 'erro'
    : result.status === 'incomplete' ? 'pergunta'
    : 'feito';
  const mostrarExemplos = !result && !isProcessing && !falado;

  // Onde fica a borda de baixo da parte visível da tela. Com o teclado
  // aberto, o Android e o iPhone só encolhem a área visível, não a página: a
  // folha presa no rodapé ficaria atrás do teclado, junto com o campo.
  const [teclado, setTeclado] = useState({ baixo: 0, altura: 0 });
  useEffect(() => {
    const vv = window.visualViewport;
    if (!isVoiceActive || !vv) return;
    const medir = () => setTeclado({
      baixo: Math.max(0, window.innerHeight - vv.height - vv.offsetTop),
      altura: vv.height,
    });
    medir();
    vv.addEventListener('resize', medir);
    vv.addEventListener('scroll', medir);
    return () => {
      vv.removeEventListener('resize', medir);
      vv.removeEventListener('scroll', medir);
    };
  }, [isVoiceActive]);

  // Esc fecha, como qualquer janela sobreposta.
  useEffect(() => {
    if (!isVoiceActive) return;
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') stopAssistant(); };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [isVoiceActive]);

  return (
    <AnimatePresence>
      {isVoiceActive && (
        // Folha na metade de baixo, por cima da página em que a pessoa está.
        // Ela fala na Agenda e vê o agendamento aparecer ali mesmo; tocar
        // fora da folha fecha.
        <motion.div key="assistente" className="fixed inset-0 z-[110]">
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={stopAssistant}
            className="absolute inset-0 bg-black/40"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Assistente de voz"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
            style={{
              bottom: teclado.baixo,
              maxHeight: teclado.altura ? Math.min(teclado.altura - 24, teclado.altura * 0.85) : undefined,
            }}
            className="absolute inset-x-0 bottom-0 max-h-[85dvh] flex flex-col rounded-t-[28px] bg-ios-surface border-t border-ios-border shadow-[0_-12px_40px_rgba(0,0,0,0.35)] overscroll-contain"
          >
            <div aria-hidden className="shrink-0 mx-auto mt-2.5 h-1 w-10 rounded-full bg-ios-text-secondary/30" />

            {/* Microfone, estado e fechar na mesma linha: a folha fica baixa. */}
            <div className="shrink-0 flex items-center gap-4 px-5 pt-3 pb-4">
              <button
                onClick={tocarMicrofone}
                aria-label={isListening ? 'Parar de ouvir' : VOZ_DISPONIVEL ? 'Falar' : 'Digitar comando'}
                className="relative shrink-0 w-16 h-16 rounded-full flex items-center justify-center"
              >
                {isListening && (
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-ios-gold/30"
                    animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
                    transition={{ repeat: Infinity, duration: 1.4, ease: 'easeOut' }}
                  />
                )}
                <span className={cn(
                  'relative w-16 h-16 rounded-full flex items-center justify-center transition-colors',
                  VOZ_DISPONIVEL ? 'bg-ios-gold text-[#111214]' : 'bg-ios-text-secondary/15 text-ios-text-primary',
                  isProcessing && 'opacity-70'
                )}>
                  {isProcessing
                    ? <Loader2 size={28} className="animate-spin" />
                    : VOZ_DISPONIVEL ? <Mic size={28} strokeWidth={2.4} /> : <Keyboard size={26} />}
                </span>
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-[17px] font-semibold text-ios-text-primary" aria-live="polite">{estado}</p>
                {falado && !result && (
                  <p className="text-[15px] text-ios-text-secondary leading-snug line-clamp-2">“{falado}”</p>
                )}
              </div>
              <button
                onClick={stopAssistant}
                aria-label="Fechar assistente"
                className="shrink-0 w-11 h-11 -mr-1 rounded-full bg-ios-text-secondary/10 text-ios-text-secondary hover:text-ios-text-primary flex items-center justify-center transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] flex flex-col gap-4">
              <AnimatePresence mode="wait">
                {result && (
                  <motion.div
                    key="resultado"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-4 rounded-2xl bg-ios-bg border border-ios-border flex flex-col gap-2.5"
                  >
                    {/* Cor sólida com texto branco ou preto: lê bem no tema claro e no escuro. */}
                    <span className={cn(
                      'self-start flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider',
                      tipoResultado === 'erro' && 'bg-red-600 text-white',
                      tipoResultado === 'pergunta' && 'bg-amber-400 text-[#111214]',
                      tipoResultado === 'feito' && 'bg-emerald-600 text-white'
                    )}>
                      {tipoResultado === 'erro' && <><AlertCircle size={13} /> Não deu certo</>}
                      {tipoResultado === 'pergunta' && <><HelpCircle size={13} /> Falta um detalhe</>}
                      {tipoResultado === 'feito' && <><Check size={13} /> Feito</>}
                    </span>
                    <p className="text-[16px] font-semibold text-ios-text-primary leading-snug">{result.message}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <form className="flex flex-col gap-2" onSubmit={enviarDigitado}>
                <div className="flex gap-2">
                  <input
                    ref={campoRef}
                    value={digitado}
                    onChange={e => { clearTimeout(fechamentoRef.current); setDigitado(e.target.value); }}
                    placeholder="Ou digite o comando..."
                    enterKeyHint="send"
                    aria-label="Comando para o assistente"
                    className="flex-1 min-w-0 h-12 px-4 rounded-2xl bg-ios-bg border border-ios-border text-ios-text-primary text-[16px] placeholder:text-ios-text-secondary focus:outline-none focus:border-ios-gold/60"
                  />
                  <button
                    type="submit"
                    disabled={!digitado.trim() || isProcessing}
                    className="h-12 px-4 rounded-2xl bg-ios-gold text-[#111214] font-bold text-[14px] disabled:opacity-35 transition-opacity"
                  >
                    Enviar
                  </button>
                </div>
                {!VOZ_DISPONIVEL && EH_IOS && (
                  <p className="text-[12px] text-ios-text-secondary px-1">No iPhone, toque no microfone do teclado para ditar.</p>
                )}
              </form>

              {mostrarExemplos && (
                <div className="flex flex-wrap gap-2" aria-label="Exemplos de comando">
                  {exemplos.map(exemplo => (
                    <button
                      key={exemplo}
                      type="button"
                      onClick={() => usarExemplo(exemplo)}
                      className="px-3.5 py-2 rounded-full bg-ios-bg border border-ios-border text-[13px] text-ios-text-secondary active:text-ios-text-primary transition-colors"
                    >
                      {exemplo}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

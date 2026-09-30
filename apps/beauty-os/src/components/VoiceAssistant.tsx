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
 * aconteceu. A versão anterior empilhava título, caixa de "Estou ouvindo",
 * campo, card de rotina do dia, doze sugestões e uma onda decorativa — mais
 * alta que a tela e centralizada na vertical, o que empurrava o botão do
 * microfone para fora da tela, sem como rolar até ele.
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

  return (
    <AnimatePresence>
      {isVoiceActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Assistente de voz"
          className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-xl flex flex-col overscroll-none"
        >
          {/* Cabeçalho em linha própria: o X não disputa espaço com o conteúdo. */}
          <div className="shrink-0 flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+12px)] pb-2">
            <span className="text-[13px] font-semibold uppercase tracking-[1.5px] text-white/40">Assistente</span>
            <button
              onClick={stopAssistant}
              aria-label="Fechar assistente"
              className="w-11 h-11 rounded-full bg-white/5 text-white/60 hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={22} />
            </button>
          </div>

          {/* Corpo rolável, começando do topo: nada fica para fora da tela. */}
          <div className="flex-1 overflow-y-auto px-6 pb-[calc(env(safe-area-inset-bottom)+24px)]">
            <div className="max-w-sm mx-auto flex flex-col items-center gap-6 pt-6">
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={tocarMicrofone}
                  aria-label={isListening ? 'Parar de ouvir' : VOZ_DISPONIVEL ? 'Falar' : 'Digitar comando'}
                  className="relative w-24 h-24 rounded-full flex items-center justify-center"
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
                    'relative w-24 h-24 rounded-full flex items-center justify-center transition-colors',
                    VOZ_DISPONIVEL ? 'bg-ios-gold text-ios-bg' : 'bg-white/10 text-white',
                    isProcessing && 'opacity-70'
                  )}>
                    {isProcessing
                      ? <Loader2 size={38} className="animate-spin" />
                      : VOZ_DISPONIVEL ? <Mic size={38} strokeWidth={2.4} /> : <Keyboard size={36} />}
                  </span>
                </button>
                <p className="text-[18px] font-semibold text-white text-center" aria-live="polite">{estado}</p>
              </div>

              {/* O que foi dito, ou o que aconteceu — nunca os dois. */}
              <AnimatePresence mode="wait">
                {result ? (
                  <motion.div
                    key="resultado"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="w-full p-5 rounded-3xl bg-white/5 border border-white/10 flex flex-col gap-3"
                  >
                    <span className={cn(
                      'self-start flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider',
                      tipoResultado === 'erro' && 'bg-red-500/15 text-red-300',
                      tipoResultado === 'pergunta' && 'bg-amber-400/15 text-amber-200',
                      tipoResultado === 'feito' && 'bg-emerald-400/15 text-emerald-300'
                    )}>
                      {tipoResultado === 'erro' && <><AlertCircle size={13} /> Não deu certo</>}
                      {tipoResultado === 'pergunta' && <><HelpCircle size={13} /> Falta um detalhe</>}
                      {tipoResultado === 'feito' && <><Check size={13} /> Feito</>}
                    </span>
                    <p className="text-[17px] font-semibold text-white leading-snug">{result.message}</p>
                  </motion.div>
                ) : falado ? (
                  <motion.p
                    key="falado"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full text-center text-[17px] text-white/80 leading-snug"
                  >
                    “{falado}”
                  </motion.p>
                ) : null}
              </AnimatePresence>

              <form className="w-full flex flex-col gap-2" onSubmit={enviarDigitado}>
                <div className="flex gap-2">
                  <input
                    ref={campoRef}
                    value={digitado}
                    onChange={e => { clearTimeout(fechamentoRef.current); setDigitado(e.target.value); }}
                    placeholder="Ou digite o comando..."
                    enterKeyHint="send"
                    aria-label="Comando para o assistente"
                    className="flex-1 min-w-0 h-12 px-4 rounded-2xl bg-white/5 border border-white/10 text-white text-[16px] placeholder:text-white/35 focus:outline-none focus:border-ios-gold/50"
                  />
                  <button
                    type="submit"
                    disabled={!digitado.trim() || isProcessing}
                    className="h-12 px-4 rounded-2xl bg-ios-gold text-ios-bg font-bold text-[14px] disabled:opacity-35 transition-opacity"
                  >
                    Enviar
                  </button>
                </div>
                {!VOZ_DISPONIVEL && EH_IOS && (
                  <p className="text-[12px] text-white/45 px-1">No iPhone, toque no microfone do teclado para ditar.</p>
                )}
              </form>

              {mostrarExemplos && (
                <div className="w-full flex flex-col gap-2">
                  <p className="text-[12px] text-white/40 px-1">Exemplos — toque para usar</p>
                  {exemplos.map(exemplo => (
                    <button
                      key={exemplo}
                      type="button"
                      onClick={() => usarExemplo(exemplo)}
                      className="w-full text-left px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/5 text-[14px] text-white/70 active:bg-white/10 transition-colors"
                    >
                      {exemplo}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

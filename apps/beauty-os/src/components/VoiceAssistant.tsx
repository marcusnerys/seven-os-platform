import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, X, Sparkles, Command } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../lib/store';
import { useVoiceAssistant, VoiceCommandResult } from '../services/voiceService';

export function VoiceAssistant() {
  const isVoiceActive = useStore(state => state.isVoiceActive);
  const setIsVoiceActive = useStore(state => state.setIsVoiceActive);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [result, setResult] = useState<VoiceCommandResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const [debugLogs, setDebugLogs] = useState<{ label: string, value: any }[]>([]);
  const [routineInsight, setRoutineInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const recognitionRef = React.useRef<any>(null);
  // Cada comando ganha um número. Fechar o assistente avança o contador, e
  // tudo que chega de um comando antigo é descartado. Um booleano de
  // "cancelado" não bastava: reabrir o assistente o zerava, e a resposta do
  // comando fechado ainda era gravada — além de fechar a sessão nova.
  const geracaoRef = React.useRef(0);
  // Depois de um resultado ou erro final, o microfone não religa sozinho: a
  // religação apagava a mensagem em menos de um segundo, antes de dar para
  // ler "Assistente ocupado" ou "Sessão expirada".
  const [pausado, setPausado] = useState(false);
  // A rotina que chega depois de fechar não pode ficar guardada para a
  // próxima abertura, onde apareceria com dados velhos.
  const ativoRef = React.useRef(isVoiceActive);
  ativoRef.current = isVoiceActive;
  const { parseCommand, executeCommand, getRoutineInsight } = useVoiceAssistant();

  const addDebugLog = (label: string, value: any) => {
    setDebugLogs(prev => [...prev.slice(-4), { label, value }]);
  };

  useEffect(() => {
    if (!isVoiceActive) setPausado(false);
    if (isVoiceActive && !isListening && !isProcessing && !pausado) {
      startListening();
    }
  }, [isVoiceActive, isProcessing, pausado]);

  useEffect(() => {
    if (isVoiceActive && !routineInsight && !isLoadingInsight) {
      setIsLoadingInsight(true);
      getRoutineInsight().then(insight => {
        if (ativoRef.current) setRoutineInsight(insight);
        setIsLoadingInsight(false);
      });
    }
    if (!isVoiceActive) {
      setRoutineInsight(null);
    }
  }, [isVoiceActive]);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Fechava sem dizer nada. No Firefox e em alguns navegadores de
      // celular a pessoa tocava no microfone e a tela simplesmente sumia.
      useStore.getState().setToast({ message: 'Este navegador não reconhece voz. Use o Chrome para falar com o assistente.', type: 'error' });
      setIsVoiceActive(false);
      return;
    }
    setPausado(false);

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
      setInterim('');
      // A pergunta de complemento ("Faltou o horário...") precisa continuar
      // na tela enquanto a pessoa responde. Antes ela era apagada no mesmo
      // instante em que o microfone religava, e a pessoa não sabia o que dizer.
      setResult(prev => (prev?.status === 'incomplete' ? prev : null));
    };

    // Microfone negado, silêncio ou rede: sem este tratamento a tela ficava
    // parada em "Aguarde..." sem explicar nada e sem forma de tentar de novo.
    recognition.onerror = (event: any) => {
      setIsListening(false);
      const recados: Record<string, string> = {
        'not-allowed': 'Permita o uso do microfone nas configurações do navegador.',
        'service-not-allowed': 'Permita o uso do microfone nas configurações do navegador.',
        'no-speech': 'Não ouvi nada. Toque no microfone para falar de novo.',
        'audio-capture': 'Nenhum microfone encontrado neste aparelho.',
        'network': 'Sem conexão para reconhecer a voz. Verifique a internet.',
      };
      if (event?.error === 'aborted') return;
      setPausado(true);
      setResult({
        action: 'unknown',
        message: recados[event?.error] ?? 'Não consegui ouvir. Toque no microfone para tentar de novo.',
        status: 'complete',
      });
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (interimTranscript) setInterim(interimTranscript);
      if (finalTranscript) {
        setTranscript(finalTranscript);
        handleFinalTranscript(finalTranscript);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  /** Mostra o resultado por alguns segundos e fecha — se ainda for o mesmo comando. */
  const fecharDepois = (geracao: number) => {
    setIsProcessing(false);
    setPausado(true);
    setTimeout(() => {
      if (geracao !== geracaoRef.current) return;
      setIsVoiceActive(false);
      setResult(null);
      setDebugLogs([]);
    }, 3500);
  };

  const handleFinalTranscript = async (text: string) => {
    const geracao = ++geracaoRef.current;
    setIsProcessing(true);
    const combinedText = lastCommand ? `${lastCommand} ${text}` : text;
    setDebugLogs([]);
    addDebugLog('Input', combinedText);

    try {
      const res = await parseCommand(combinedText);
      if (geracao !== geracaoRef.current) return;
      setResult(res);
      addDebugLog('Intent', res.action);
      addDebugLog('Entities', res.data);
      addDebugLog('Status', res.status);

      if (res.status === 'incomplete') {
        setLastCommand(combinedText);
        setIsProcessing(false);
        addDebugLog('Workflow', 'Aguardando complemento');
        return;
      }

      if (res.action === 'unknown') {
        setLastCommand('');
        addDebugLog('Error', 'Comando não reconhecido');
        fecharDepois(geracao);
        return;
      }

      addDebugLog('Backend', 'Iniciando execução...');
      let resultado: Awaited<ReturnType<typeof executeCommand>> = null;
      try {
        // A frase do Gemini é o que ele entendeu; o que de fato aconteceu
        // vem daqui. Cliente não encontrado, horário ocupado, nome
        // ambíguo — antes a tela confirmava mesmo assim.
        resultado = await executeCommand(res);
      } catch {
        if (geracao !== geracaoRef.current) return;
        // A gravação falhou depois de a tela já ter dito que deu certo.
        // Antes o assistente só fechava, e a pessoa acreditava no "feito".
        setResult({ ...res, action: 'unknown', message: 'Não consegui salvar. Verifique a conexão e tente de novo.' });
        setLastCommand('');
        fecharDepois(geracao);
        return;
      }
      if (geracao !== geracaoRef.current) return;

      // Pergunta ("qual Ana?", "qual horário?") mantém a conversa aberta:
      // o microfone religa e a resposta é somada ao comando original. Antes
      // a pergunta aparecia e o assistente fechava em 3 segundos, sem dar
      // como responder.
      if (resultado?.pergunta) {
        setResult({ ...res, message: resultado.mensagem, status: 'incomplete' });
        setLastCommand(combinedText);
        setIsProcessing(false);
        return;
      }

      if (resultado) setResult({ ...res, message: resultado.mensagem });
      addDebugLog('Firebase', 'Dados sincronizados');
      setLastCommand('');
      fecharDepois(geracao);
    } catch (error) {
      if (geracao !== geracaoRef.current) return;
      addDebugLog('Fatal', error instanceof Error ? error.message : 'Erro desconhecido');
      setResult({ action: 'unknown', message: 'Algo deu errado. Tente de novo.', status: 'complete' });
      setLastCommand('');
      fecharDepois(geracao);
    }
  };

  const stopAssistant = () => {
    geracaoRef.current++;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsVoiceActive(false);
    setIsListening(false);
    setIsProcessing(false);
    setLastCommand('');
    setResult(null);
    setDebugLogs([]);
  };

  return (
    <AnimatePresence>
      {isVoiceActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center overscroll-none"
          >
            {/* Listening Glow */}
            <div className={cn(
              "absolute inset-0 transition-opacity duration-1000 pointer-events-none",
              isListening ? "bg-[radial-gradient(circle_at_center,rgba(230,192,139,0.12)_0%,transparent_70%)] opacity-100 animate-pulse" : "opacity-0",
              isProcessing ? "bg-[radial-gradient(circle_at_center,rgba(0,230,255,0.1)_0%,transparent_70%)] opacity-100" : ""
            )} />
            
            <button 
              onClick={stopAssistant}
              className="absolute top-12 right-8 p-3 rounded-full bg-white/5 text-white/50 hover:text-white transition-colors z-20"
            >
              <X size={24} />
            </button>

            <motion.div
              animate={{ 
                scale: isProcessing ? [1, 1.1, 1] : (isListening ? [1, 1.08, 1] : 1),
                boxShadow: isProcessing 
                  ? ["0 0 20px rgba(0,230,255,0.3)", "0 0 60px rgba(0,230,255,0.5)", "0 0 20px rgba(0,230,255,0.3)"]
                  : (isListening ? ["0 0 20px rgba(230,192,139,0.3)", "0 0 60px rgba(230,192,139,0.5)", "0 0 20px rgba(230,192,139,0.3)"] : "0 0 20px rgba(230,192,139,0.3)")
              }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              // Depois de um silêncio ou erro não havia como tentar de novo
              // sem fechar e reabrir o assistente.
              onClick={() => { if (!isListening && !isProcessing) startListening(); }}
              role="button"
              aria-label="Falar de novo"
              className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center text-ios-bg mb-12 z-10 transition-colors duration-500 cursor-pointer",
                isProcessing ? "bg-ios-cyan" : "bg-ios-gold"
              )}
            >
              <AnimatePresence mode="wait">
                {isProcessing ? (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0, rotate: -180 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 180 }}
                  >
                    <Sparkles size={42} className="animate-spin-slow" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="mic"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                  >
                    <Mic size={42} strokeWidth={2.5} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <div className="flex flex-col gap-6 max-w-sm w-full">
              <h2 className="text-[24px] font-bold text-white tracking-tight leading-tight">
                {isProcessing ? 'Processando...' : (isListening ? 'Como posso ajudar?' : 'Toque no microfone para falar')}
              </h2>

              <div className="min-h-[100px] p-6 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-md flex flex-col items-center justify-center gap-3">
                <AnimatePresence mode="wait">
                  {!result ? (
                    <motion.p 
                      key="transcript"
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }}
                      className="text-[18px] font-medium text-white/80"
                    >
                      {interim || transcript || 'Estou ouvindo...'}
                    </motion.p>
                  ) : (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center gap-3"
                    >
                      <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full border",
                        result.action === 'unknown' ? "bg-ios-red/10 text-ios-red border-ios-red/20" : "bg-ios-cyan/10 text-ios-cyan border-ios-cyan/20"
                      )}>
                        <Command size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          {result.action === 'unknown' ? 'Erro' : 'Assistente Operational'}
                        </span>
                      </div>
                      <p className="text-[18px] font-bold text-white leading-tight">
                        {result.message}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Routine Insight Card */}
              {(routineInsight || isLoadingInsight) && !isProcessing && !result && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 p-4 rounded-2xl bg-ios-gold/10 border border-ios-gold/20 text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={12} className="text-ios-gold" />
                    <span className="text-[10px] font-bold text-ios-gold uppercase tracking-widest">IA — Rotina do Dia</span>
                  </div>
                  {isLoadingInsight ? (
                    <div className="flex gap-1">
                      {[0,1,2].map(i => (
                        <motion.div key={i} animate={{ opacity: [0.3,1,0.3] }} transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                          className="w-1.5 h-1.5 rounded-full bg-ios-gold" />
                      ))}
                    </div>
                  ) : (
                    <p className="text-[13px] text-white/80 leading-relaxed">{routineInsight}</p>
                  )}
                </motion.div>
              )}

              {!isProcessing && !result && (
                <div className="mt-4 flex flex-col gap-3">
                  <p className="text-[11px] font-bold text-ios-text-secondary uppercase tracking-[1.5px] opacity-40">Tente dizer:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      "Agendar Ana amanhã 14h",
                      "Registrar venda de 200 reais",
                      "Adicionar despesa de 50 reais",
                      "Ver agenda de hoje",
                      "Cadastrar nova cliente",
                      "Cancelar agendamento da Maria",
                      "Resumo financeiro do mês",
                      "Clientes inativas",
                      "Mandar WhatsApp para Ana",
                      "Promover Joana para VIP",
                      "Criar serviço Extensão de Cílios",
                      "Ver dashboard",
                    ].map((tip, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-full bg-white/5 text-[11px] font-medium text-white/60 border border-white/5">
                        "{tip}"
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Debug Execution Logs */}
            {debugLogs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute right-8 bottom-32 max-w-[240px] text-left hidden lg:flex flex-col gap-2 p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-ios-cyan animate-pulse" />
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Execution Engine</span>
                </div>
                {debugLogs.map((log, i) => (
                  <div key={i} className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold text-ios-cyan uppercase tracking-wider opacity-60">{log.label}</span>
                    <span className="text-[11px] font-mono text-white/90 truncate">
                      {typeof log.value === 'object' ? JSON.stringify(log.value) : String(log.value)}
                    </span>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Premium Waveform Interaction */}
            <div className="absolute bottom-20 left-0 right-0 flex items-center justify-center gap-1 h-8 opacity-40">
               {[...Array(12)].map((_, i) => (
                 <motion.div
                   key={i}
                   animate={{ 
                     height: isListening ? [8, Math.random() * 32 + 8, 8] : 2 
                   }}
                   transition={{ 
                     repeat: Infinity, 
                     duration: 0.5 + Math.random() * 0.5,
                     ease: "easeInOut"
                   }}
                   className="w-1 bg-ios-gold rounded-full"
                 />
               ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
  );
}

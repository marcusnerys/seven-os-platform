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
  const recognitionRef = React.useRef<any>(null);
  const { parseCommand, executeCommand } = useVoiceAssistant();

  const addDebugLog = (label: string, value: any) => {
    setDebugLogs(prev => [...prev.slice(-4), { label, value }]);
  };

  useEffect(() => {
    if (isVoiceActive && !isListening && !isProcessing) {
      startListening();
    }
  }, [isVoiceActive, isProcessing]);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsVoiceActive(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
      setInterim('');
      setResult(null);
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
      // Only close assistant if not processing or incomplete
    };

    recognition.start();
  };

  const handleFinalTranscript = async (text: string) => {
    setIsProcessing(true);
    const combinedText = lastCommand ? `${lastCommand} ${text}` : text;
    setDebugLogs([]); // Clear for new command
    addDebugLog('Input', combinedText);
    
    try {
      const res = await parseCommand(combinedText);
      setResult(res);
      addDebugLog('Intent', res.action);
      addDebugLog('Entities', res.data);
      addDebugLog('Status', res.status);
      
      if (res.status === 'complete' && res.action !== 'unknown') {
        // Execute immediately
        addDebugLog('Backend', 'Iniciando execução...');
        await executeCommand(res);
        addDebugLog('Firebase', 'Dados sincronizados');
        setLastCommand('');
        
        // Brief pause to show success message
        setTimeout(() => {
          setIsProcessing(false);
          setIsVoiceActive(false);
          setResult(null);
          setDebugLogs([]);
        }, 3000);
      } else if (res.status === 'incomplete') {
        // Ask follow up
        setLastCommand(combinedText);
        setIsProcessing(false);
        addDebugLog('Workflow', 'Aguardando complemento');
        // Recognition will automatically restart due to useEffect
      } else {
        // Unknown or error
        setIsProcessing(false);
        setLastCommand('');
        addDebugLog('Error', 'Comando não reconhecido');
        setTimeout(() => {
          setIsVoiceActive(false);
          setResult(null);
          setDebugLogs([]);
        }, 3000);
      }
    } catch (error) {
      addDebugLog('Fatal', error instanceof Error ? error.message : 'Erro desconhecido');
      setIsProcessing(false);
      setIsVoiceActive(false);
    }
  };

  const stopAssistant = () => {
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
              className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center text-ios-bg mb-12 z-10 transition-colors duration-500",
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
                {isProcessing ? 'Processando...' : (isListening ? 'Como posso ajudar?' : 'Aguarde...')}
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

              {!isProcessing && !result && (
                <div className="mt-8 flex flex-col gap-4">
                  <p className="text-[11px] font-bold text-ios-text-secondary uppercase tracking-[1.5px] opacity-40">Tente dizer:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      "Agendar Ana amanhã 14h",
                      "Registrar venda de 150 reais",
                      "Ver agenda",
                      "Adicionar despesa"
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

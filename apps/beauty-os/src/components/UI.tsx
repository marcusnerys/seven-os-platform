import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Mic, MicOff } from 'lucide-react';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  key?: React.Key;
}

export function GlassCard({ children, className, ...props }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("card-immersive overflow-hidden", className)}
      {...props as any}
    >
      {children}
    </motion.div>
  );
}

export function StatusBadge({ label, variant = 'default', key }: { label: string, variant?: 'default' | 'vip' | 'gold' | 'cyan' | 'ios', key?: React.Key }) {
  const variants = {
    default: "bg-white/5 text-white/50 border border-white/5",
    vip: "bg-ios-gold/10 text-ios-gold border border-ios-gold/20 shadow-[0_0_10px_rgba(230,192,139,0.1)]",
    ios: "bg-ios-cyan/10 text-ios-cyan border border-ios-cyan/20 shadow-[0_0_10px_rgba(0,229,255,0.1)]",
    gold: "bg-ios-gold/20 text-ios-gold border border-ios-gold/30",
    cyan: "bg-ios-cyan/20 text-ios-cyan border border-ios-cyan/30",
  };
  
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.8px]", variants[variant])}>
      {label}
    </span>
  );
}

export function Avatar({ src, fallback, size = 'md' }: { src?: string, fallback: string, size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: "w-8 h-8 text-[10px]",
    md: "w-8 h-8 text-[10px]", // Matching theme's 32px
    lg: "w-14 h-14 text-sm",
  };
  
  return (
    <div className={cn("rounded-full bg-linear-to-br from-[#333] to-[#555] flex items-center justify-center border border-ios-border text-ios-gold font-bold", sizes[size])}>
      {src ? <img src={src} alt={fallback} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" /> : <span>{fallback}</span>}
    </div>
  );
}

export function Button({ children, className, variant = 'primary', loading, disabled, ...props }: { children: React.ReactNode, variant?: 'primary' | 'secondary' | 'ghost', loading?: boolean, className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: "bg-ios-gold text-[#0B0B0D] font-display font-semibold shadow-[0_8px_20px_rgba(212,175,55,0.25)] border border-white/10",
    secondary: "bg-white/5 text-white font-display font-semibold border border-white/10 backdrop-blur-md",
    ghost: "text-ios-text-secondary hover:text-white transition-colors",
  };

  return (
    <motion.button
      whileTap={!disabled && !loading ? { scale: 0.96, opacity: 0.9 } : {}}
      disabled={disabled || loading}
      className={cn(
        "px-6 h-[52px] rounded-[18px] text-[15px] flex items-center justify-center gap-2 transition-all active:opacity-80 active:translate-y-0.5", 
        variants[variant], 
        (disabled || loading) && "opacity-50 cursor-not-allowed",
        className
      )}
      {...props as any}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : children}
    </motion.button>
  );
}

export function Toast({ message, type = 'success', isVisible, onClose }: { message: string, type?: 'success' | 'error', isVisible: boolean, onClose: () => void }) {
  React.useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[110] w-max max-w-[90vw]"
        >
          <div className="px-5 py-3 rounded-2xl bg-[#1C1C1E]/95 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center gap-3">
            <div className={cn("w-2 h-2 rounded-full", type === 'success' ? "bg-ios-cyan shadow-[0_0_8px_#00E6FF]" : "bg-red-500 shadow-[0_0_8px_#ef4444]")} />
            <span className="text-sm font-medium text-white">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function PWAInstallPrompt() {
  const [show, setShow] = React.useState(false);
  const [platform, setPlatform] = React.useState<'ios' | 'android' | 'other'>('other');

  React.useEffect(() => {
    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    
    // Check if standalone
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;

    if (!isStandalone) {
      if (isIos) setPlatform('ios');
      else if (isAndroid) setPlatform('android');
      
      // Show prompt after 5 seconds of first visit or similar
      const timer = setTimeout(() => setShow(true), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-24 left-4 right-4 z-[90]"
    >
      <GlassCard className="p-5 flex flex-col gap-3 bg-[#1C1C1E]/95 backdrop-blur-2xl border-ios-gold/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-ios-bg border border-white/10 flex items-center justify-center logo-gradient overflow-hidden">
             <span className="text-ios-gold font-bold text-xl">L</span>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-white">Instalar Leshanot Studio</h3>
            <p className="text-[11px] text-ios-text-secondary leading-tight mt-0.5">Adicione à sua tela inicial para uma experiência de app nativo.</p>
          </div>
          <button onClick={() => setShow(false)} className="text-ios-text-secondary p-1">
            <span className="text-xs">Fechar</span>
          </button>
        </div>
        
        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
          {platform === 'ios' ? (
            <p className="text-[10px] text-white/80 leading-relaxed">
              Toque no botão <span className="text-ios-cyan">Compartilhar</span> no seu navegador e selecione <span className="text-ios-gold font-bold">"Adicionar à Tela de Início"</span>.
            </p>
          ) : (
            <p className="text-[10px] text-white/80 leading-relaxed">
              Abra as <span className="text-ios-cyan">opções do navegador</span> e selecione <span className="text-ios-gold font-bold">"Instalar Aplicativo"</span> ou <span className="text-ios-gold font-bold">"Adicionar à tela inicial"</span>.
            </p>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}

export function Modal({ isOpen, onClose, title, children, footer }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode, footer?: React.ReactNode }) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="bg-ios-surface w-full max-w-[430px] rounded-t-[40px] sm:rounded-[32px] border-t border-x sm:border border-white/10 overflow-hidden flex flex-col max-h-[95vh] shadow-[0_-20px_40px_rgba(0,0,0,0.4)] relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 pb-4 flex items-center justify-between border-b border-white/5 bg-ios-surface/80 backdrop-blur-md z-10 shrink-0">
          <div className="flex flex-col gap-0.5">
            <p className="text-[10px] font-bold text-ios-gold uppercase tracking-[1.5px] opacity-70">Leshanot Studio</p>
            <h2 className="text-[22px] font-bold tracking-tightest text-white leading-tight">{title}</h2>
          </div>
          <button onClick={onClose} className="bg-white/5 p-3 rounded-full text-ios-text-secondary active:opacity-50 transition-opacity">
             <span className="text-xs font-bold px-1">Fechar</span>
          </button>
        </div>
        
        <div className="p-6 pt-8 overflow-y-auto hide-scrollbar flex-1 pb-[140px]">
          {children}
        </div>

        {footer && (
          <div className="absolute bottom-0 left-0 right-0 p-6 pb-10 border-t border-white/5 bg-[#0B0B0D]/95 backdrop-blur-2xl z-20 shrink-0">
            <div className="max-w-[400px] mx-auto">
              {footer}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export function VoiceButton({ onResult, onInterim, className }: { onResult: (text: string) => void, onInterim?: (text: string) => void, className?: string }) {
  const [isListening, setIsListening] = React.useState(false);
  const recognitionRef = React.useRef<any>(null);

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
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

      if (finalTranscript && onResult) {
        onResult(finalTranscript);
      }
      if (interimTranscript && onInterim) {
        onInterim(interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed') {
        alert('Permissão de microfone negada. Verifique as configurações do seu navegador e do app.');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const hasSupport = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  if (!hasSupport) return null;

  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleListening(); }}
      className={cn(
        "p-2 rounded-lg transition-all active:scale-95 shrink-0 flex items-center justify-center",
        isListening ? "text-red-500 animate-pulse" : "text-ios-gold/60 hover:text-ios-gold",
        className
      )}
      title={isListening ? "Ouvindo..." : "Falar"}
    >
      {isListening ? <MicOff size={18} /> : <Mic size={18} />}
    </button>
  );
}

export function Input({ 
  voice = false, 
  onResult, 
  className, 
  value,
  onChange,
  ...props 
}: { 
  voice?: boolean, 
  onResult?: (text: string) => void,
  className?: string,
  value?: string,
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const [interim, setInterim] = React.useState('');

  const handleVoiceResult = (text: string) => {
    setInterim('');
    if (onResult) {
      onResult(text);
    } else if (onChange) {
      // Create a fake event to trigger onChange
      const fakeEvent = {
        target: { value: value ? value + ' ' + text : text }
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(fakeEvent);
    }
  };

  const handleInterim = (text: string) => {
    setInterim(text);
  };

  return (
    <div className="relative flex items-center group w-full">
      <input
        className={cn(
          "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-ios-gold/50 transition-colors pr-10",
          className
        )}
        value={interim ? (value ? value + ' ' + interim : interim) : value}
        onChange={onChange}
        {...props}
      />
      {voice && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <VoiceButton onResult={handleVoiceResult} onInterim={handleInterim} />
        </div>
      )}
    </div>
  );
}

export function Textarea({ 
  voice = false, 
  onResult, 
  className, 
  value,
  onChange,
  ...props 
}: { 
  voice?: boolean, 
  onResult?: (text: string) => void,
  className?: string,
  value?: string,
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [interim, setInterim] = React.useState('');

  const handleVoiceResult = (text: string) => {
    setInterim('');
    if (onResult) {
      onResult(text);
    } else if (onChange) {
      const fakeEvent = {
        target: { value: value ? value + ' ' + text : text }
      } as React.ChangeEvent<HTMLTextAreaElement>;
      onChange(fakeEvent);
    }
  };

  const handleInterim = (text: string) => {
    setInterim(text);
  };

  return (
    <div className="relative flex flex-col group w-full">
      <textarea
        className={cn(
          "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-ios-gold/50 transition-colors min-h-[100px] pr-10",
          className
        )}
        value={interim ? (value ? value + ' ' + interim : interim) : value}
        onChange={onChange}
        {...props}
      />
      {voice && (
        <div className="absolute right-2 top-3">
          <VoiceButton onResult={handleVoiceResult} onInterim={handleInterim} />
        </div>
      )}
    </div>
  );
}

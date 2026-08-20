import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { resolveMessage, openWhatsApp } from '../lib/whatsapp';
import { Modal, Button } from './UI';
import { Gift, MessageCircle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export function AutomationService() {
  const { clients, automationTemplates, automationLogs, addAutomationLog, user } = useStore();
  const [pendingBirthdays, setPendingBirthdays] = useState<any[]>([]);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (!user || clients.length === 0 || automationTemplates.length === 0) return;

    const checkBirthdays = () => {
      const now = new Date();
      const currentMonthDay = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const todayStr = now.toISOString().split('T')[0];
      const logKey = `birthday_${todayStr}`;

      // Check if already processed today
      if (automationLogs.includes(logKey)) return;

      // Check if it's after 09:00 AM
      if (now.getHours() < 9) return;

      const template = automationTemplates.find(t => t.type === 'birthday' && t.isActive);
      if (!template) return;

      const birthdays = clients.filter(c => {
        if (!c.birthDate) return false;
        return c.birthDate.substring(5) === currentMonthDay;
      });

      if (birthdays.length > 0) {
        setPendingBirthdays(birthdays);
        setShowPrompt(true);
      }
    };

    // Run initial check
    checkBirthdays();

    // Check periodically (every 15 minutes)
    const interval = setInterval(checkBirthdays, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, clients, automationTemplates, automationLogs]);

  const handleSendAll = async () => {
    const template = automationTemplates.find(t => t.type === 'birthday');
    if (!template) return;

    // We can't really "bulk send" in browser tabs easily without being blocked
    // So we'll open them one by one or just the first one and suggest the rest
    // For this simulation/UX, we'll open the first one and mark today as done
    
    pendingBirthdays.slice(0, 1).forEach((client) => {
      const message = resolveMessage(template.message, {
        nome: client.name,
        empresa: 'LESHANOT STUDIO'
      });
      openWhatsApp(client.phone, message);
    });

    if (pendingBirthdays.length > 1) {
      setPendingBirthdays(prev => prev.slice(1));
      return; // Keep prompt open for next one
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    await addAutomationLog(`birthday_${todayStr}`);
    setShowPrompt(false);
  };

  const handleDismiss = async () => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    await addAutomationLog(`birthday_${todayStr}`);
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="absolute bottom-32 left-6 right-6 z-[60] pointer-events-none"
        >
          <div className="max-w-[400px] mx-auto pointer-events-auto">
            <div className="bg-ios-surface/95 backdrop-blur-2xl border border-ios-gold/20 rounded-[28px] p-5 shadow-[0_30px_60px_rgba(0,0,0,0.6)] flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-ios-gold/10 flex items-center justify-center text-ios-gold">
                    <Gift size={24} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-[16px] font-bold text-white tracking-tight">Aniversários de Hoje 🎂</h3>
                    <p className="text-[12px] text-ios-text-secondary">
                      {pendingBirthdays.length} {pendingBirthdays.length === 1 ? 'cliente faz' : 'clientes fazem'} aniversário.
                    </p>
                  </div>
                </div>
                <button onClick={handleDismiss} className="p-1 text-white/20 hover:text-white/50">
                   <X size={20} />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {pendingBirthdays.slice(0, 2).map(c => (
                  <div key={c.id} className="flex items-center justify-between px-2 py-1">
                    <span className="text-[13px] text-white/80 font-medium">{c.name}</span>
                    <span className="text-[11px] text-ios-text-secondary">{c.phone}</span>
                  </div>
                ))}
                {pendingBirthdays.length > 2 && (
                  <p className="text-[11px] text-ios-gold font-medium px-2 italic">+ {pendingBirthdays.length - 2} outras clientes</p>
                )}
              </div>

              <div className="flex gap-3 mt-1">
                <Button onClick={handleSendAll} className="flex-1 h-12 shadow-lg shadow-ios-gold/20 font-bold">
                  <MessageCircle size={18} className="mr-2" />
                  {pendingBirthdays.length > 1 ? 'Próximo Parabéns' : 'Enviar Parabéns'}
                </Button>
                <Button variant="secondary" onClick={handleDismiss} className="h-12 border-none">
                  Ignorar
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

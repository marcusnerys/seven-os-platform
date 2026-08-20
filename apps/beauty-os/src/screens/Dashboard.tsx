import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard, StatusBadge, Avatar, Modal, Button } from '../components/UI';
import { Logo } from '../components/Logo';
import { TrendingUp, Users, DollarSign, Calendar, ChevronRight, UserPlus, PlusCircle, Gift, MessageCircle, Bell, Lightbulb, Sparkles, Camera } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { resolveMessage, openWhatsApp } from '../lib/whatsapp';
import { cn } from '../lib/utils';
import { useStore } from '../lib/store';

export default function Dashboard() {
  const { setActiveTab, setModalToOpen, updateUserAvatar, getRevenueData, getRevenueForecast, getSmartInsight, clients, appointments, transactions, user, notifications, markNotificationAsRead, automationTemplates, setShowDevTools } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const startLongPress = () => {
    longPressTimer.current = setTimeout(() => {
      setShowDevTools(true);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 2000); // 2 seconds long press
  };

  const endLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const revenueForecast = getRevenueForecast();

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) { // Limit to 1MB
      alert('A imagem deve ter menos de 1MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      await updateUserAvatar(base64String);
    };
    reader.readAsDataURL(file);
  };

  const getBibleVerse = () => {
    const verses = [
      { text: "O Senhor é o meu pastor; nada me faltará.", ref: "Salmo 23:1" },
      { text: "Tudo posso naquele que me fortalece.", ref: "Filipenses 4:13" },
      { text: "Seja forte e corajoso! O Senhor, seu Deus, estará com você.", ref: "Josué 1:9" },
      { text: "O Senhor é a minha luz e a minha salvação; de quem terei medo?", ref: "Salmo 27:1" },
      { text: "Entrega o teu caminho ao Senhor; confia nele, e ele o fará.", ref: "Salmo 37:5" },
      { text: "Pois eu sei os planos que tenho para vocês; planos de paz.", ref: "Jeremias 29:11" },
      { text: "Alegrem-se na esperança, sejam pacientes na tribulação.", ref: "Romanos 12:12" },
      { text: "O que é impossível para os homens é possível para Deus.", ref: "Lucas 18:27" },
      { text: "Mil cairão ao teu lado, mas o mal não chegará a ti.", ref: "Salmo 91:7" },
      { text: "O Senhor te abençoe e te guarde.", ref: "Números 6:24" },
      { text: "Deem graças ao Senhor, porque ele é bom.", ref: "Salmo 136:1" },
      { text: "A paz de Deus, que excede todo o entendimento, guardará você.", ref: "Filipenses 4:7" },
      { text: "Espera no Senhor, anima-te, e ele fortalecerá o teu coração.", ref: "Salmo 27:14" },
      { text: "O amor é sofredor, é benigno; o amor tudo suporta.", ref: "1 Coríntios 13:4" },
      { text: "Busquem, pois, em primeiro lugar o Reino de Deus.", ref: "Mateus 6:33" },
      { text: "Lâmpada para os meus pés é tua palavra e luz, para o meu caminho.", ref: "Salmo 119:105" },
      { text: "Guardei no coração a tua palavra para não pecar contra ti.", ref: "Salmo 119:11" },
      { text: "Grandes coisas fez o Senhor por nós, por isso estamos alegres.", ref: "Salmo 126:3" },
      { text: "O coração alegre aformoseia o rosto.", ref: "Provérbios 15:13" },
      { text: "Onde o Espírito do Senhor está, aí há liberdade.", ref: "2 Coríntios 3:17" }
    ];
    
    // Pick based on day of the year
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return verses[dayOfYear % verses.length];
  };

  const verse = getBibleVerse();
  const revenueData = getRevenueData();
  const insight = getSmartInsight();
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentMonthDay = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const todayAppointments = appointments.filter(a => a.date === today);
  const totalRevenue = transactions.filter(t => t.type === 'revenue').reduce((acc, curr) => acc + curr.amount, 0);

  const birthdaysToday = clients.filter(c => {
    if (!c.birthDate) return false;
    // birthDate is YYYY-MM-DD
    return c.birthDate.substring(5) === currentMonthDay;
  });

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const tomorrowAppointments = appointments.filter(a => a.date === tomorrowStr);

  const handleSendBirthday = (client: any) => {
    const template = automationTemplates.find(t => t.type === 'birthday' && t.isActive);
    if (!template) return;

    const message = resolveMessage(template.message, {
      nome: client.name,
      empresa: 'LESHANOT STUDIO'
    });

    openWhatsApp(client.phone, message);
  };

  const handleBulkReminders = () => {
    const template = automationTemplates.find(t => t.type === 'reminder' && t.isActive);
    if (!template || tomorrowAppointments.length === 0) return;

    // Send the first one as a demonstration (bulk opening tabs is often blocked by browsers)
    const appt = tomorrowAppointments[0];
    const client = clients.find(c => c.id === appt.clientId);
    const phone = client?.phone || appt.clientPhone;
    if (!phone) return;

    const message = resolveMessage(template.message, {
      nome: client?.name || appt.clientName,
      servico: appt.service,
      data: 'amanhã',
      hora: appt.time,
      empresa: 'LESHANOT STUDIO'
    });

    openWhatsApp(phone, message);
  };

  return (
    <div className="flex flex-col gap-6 p-6 pb-12 overflow-y-auto h-full hide-scrollbar">
      {/* Brand Header */}
      <div 
        className="flex flex-col mt-4 shrink-0 cursor-default select-none"
        onMouseDown={startLongPress}
        onMouseUp={endLongPress}
        onMouseLeave={endLongPress}
        onTouchStart={startLongPress}
        onTouchEnd={endLongPress}
      >
        <Logo size="md" className="mb-2" />
      </div>

      <div className="flex flex-col mt-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-ios-text-secondary">Bem-vinda de volta,</span>
            <h2 className="text-[20px] font-bold tracking-tightest text-white">
              {user?.displayName || 'Studio'} ✨
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsNotificationsOpen(true)}
              className="relative p-2 rounded-full bg-white/5 border border-white/5 text-ios-text-secondary active:scale-95 transition-transform"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-ios-gold rounded-full border-2 border-[#0B0B0D] shadow-[0_0_8px_rgba(230,192,139,0.5)]" />
              )}
            </button>
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
              <Avatar 
                size="md" 
                src={user?.photoURL || undefined}
                fallback={user?.displayName?.charAt(0) || 'U'} 
              />
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={12} className="text-white" />
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bible Verse Card */}
      <GlassCard className="p-5 bg-white/[0.03] border-white/5 flex items-start gap-4 min-h-[160px] shrink-0">
        <div className="w-12 h-12 rounded-[18px] bg-ios-gold/10 flex items-center justify-center text-ios-gold shrink-0 border border-ios-gold/20 shadow-[0_0_20px_rgba(230,192,139,0.1)]">
          <Sparkles size={22} className="opacity-90" />
        </div>
        <div className="flex flex-col flex-1 min-w-0 h-full">
          <span className="text-[10px] font-bold text-ios-gold uppercase tracking-[1.2px] opacity-70 mb-2">Palavra de Fé</span>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[80px]">
            <p className="text-[15px] text-white/90 leading-[1.6] font-medium tracking-tight">
              "{verse.text}"
            </p>
          </div>
          <span className="text-[11px] font-bold text-ios-gold/60 self-end italic mt-2 shrink-0">— {verse.ref}</span>
        </div>
      </GlassCard>

      {/* Birthday Banner */}
      {birthdaysToday.length > 0 && (
        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
        >
          <GlassCard className="p-4 bg-gradient-to-br from-pink-500/10 to-ios-gold/10 border-ios-gold/20 flex flex-col gap-3">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-ios-gold/20 flex items-center justify-center text-ios-gold">
                      <Gift size={20} />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-ios-gold uppercase tracking-wider">Aniversariante do dia</span>
                      <span className="text-[15px] font-extrabold text-white">{birthdaysToday[0].name} 🎂</span>
                   </div>
                </div>
                <Button 
                   onClick={() => handleSendBirthday(birthdaysToday[0])}
                   className="h-9 px-4 text-[11px] font-bold bg-ios-gold text-ios-bg border-none shadow-none"
                >
                   <MessageCircle size={14} />
                   Parabenizar
                </Button>
             </div>
             {birthdaysToday.length > 1 && (
                <p className="text-[10px] text-ios-text-secondary font-medium">
                   + {birthdaysToday.length - 1} clientes também fazem aniversário hoje.
                </p>
             )}
          </GlassCard>
        </motion.div>
      )}

      {/* Reminder Banner */}
      {tomorrowAppointments.length > 0 && (
        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
        >
          <GlassCard className="p-4 bg-ios-cyan/5 border-ios-cyan/20 flex flex-col gap-3">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-ios-cyan/10 flex items-center justify-center text-ios-cyan">
                      <Bell size={20} />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-ios-cyan uppercase tracking-wider">Lembretes de Amanhã</span>
                      <span className="text-[15px] font-extrabold text-white">{tomorrowAppointments.length} agendamentos</span>
                   </div>
                </div>
                <Button 
                   onClick={handleBulkReminders}
                   className="h-9 px-4 text-[11px] font-bold bg-ios-cyan text-ios-bg border-none shadow-none"
                >
                   <MessageCircle size={14} />
                   Lembrar Clientes
                </Button>
             </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Revenue Card */}
      <GlassCard 
        onClick={() => setActiveTab('financial')}
        className="card-gold-immersive p-[16px] flex flex-col gap-4 relative group cursor-pointer active:scale-[0.98] transition-transform shrink-0"
      >
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-ios-gold font-bold uppercase tracking-[1px] mb-1">Faturamento Acumulado</span>
            <span className="text-3xl font-bold tracking-tightest">
              R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
            <ChevronRight size={18} className="text-ios-text-secondary" />
          </div>
        </div>
        
        <div className="h-12 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueData}>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#E6C08B" 
                strokeWidth={2.5} 
                dot={false}
                strokeLinecap="round"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-[12px]">
        {[
          { label: 'Clientes', value: clients.length.toString(), icon: Users, color: 'gold', tab: 'clients' },
          { label: 'Hoje', value: todayAppointments.length.toString(), icon: Calendar, color: 'gold', tab: 'agenda' },
          { label: 'Projeção/Mês', value: `R$ ${revenueForecast.toFixed(0)}`, icon: TrendingUp, color: 'cyan', tab: 'agenda' },
          { label: 'Agenda Total', value: appointments.length.toString(), icon: UserPlus, color: 'gold', tab: 'agenda' },
        ].map((kpi, i) => (
          <GlassCard 
            key={i} 
            onClick={() => setActiveTab(kpi.tab as any)}
            className="kpi-card-immersive p-4 flex flex-col gap-1.5 border-t border-white/5 cursor-pointer active:bg-white/5"
          >
            <p className="text-[9px] text-ios-text-secondary font-bold uppercase tracking-[0.8px]">{kpi.label}</p>
            <p className={cn("text-lg font-bold tracking-tightest", kpi.color === 'cyan' ? 'text-ios-cyan' : 'text-ios-text-primary')}>
              {kpi.value}
            </p>
          </GlassCard>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col gap-3">
         <h2 className="text-[10px] font-bold tracking-[0.5px] uppercase text-ios-text-secondary px-1">Atalhos rápidos</h2>
         <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
            {[
              { id: 'appointment', label: 'Novo agendamento', icon: PlusCircle, tab: 'agenda' },
              { id: 'client', label: 'Nova cliente', icon: UserPlus, tab: 'clients' },
              { id: 'revenue', label: 'Registrar venda', icon: DollarSign, tab: 'financial' },
              { id: 'agenda', label: 'Ver agenda', icon: Calendar, tab: 'agenda' },
            ].map((action, i) => (
              <div 
                key={i} 
                onClick={() => {
                  setActiveTab(action.tab as any);
                  if (action.id !== 'agenda') setModalToOpen(action.id as any);
                }}
                className="flex flex-col items-center gap-1.5 min-w-[70px] cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-ios-surface border border-ios-border flex items-center justify-center text-ios-gold shadow-lg active:scale-95 transition-transform">
                  <action.icon size={20} />
                </div>
                <span className="text-[9px] font-bold text-ios-text-secondary text-center leading-tight">{action.label}</span>
              </div>
            ))}
         </div>
      </div>
      
      <Modal 
        isOpen={isNotificationsOpen} 
        onClose={() => setIsNotificationsOpen(false)} 
        title="Notificações"
      >
        <div className="flex flex-col gap-3">
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <GlassCard 
                key={n.id} 
                onClick={() => markNotificationAsRead(n.id)}
                className={cn(
                  "p-4 flex flex-col gap-1 cursor-default active:scale-100",
                  n.read ? "opacity-60 bg-white/[0.01]" : "bg-white/[0.03] border-ios-gold/10"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-ios-gold uppercase tracking-wider">{n.title}</span>
                  {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-ios-gold" />}
                </div>
                <p className="text-[13px] text-white/90 leading-snug whitespace-pre-line">{n.message}</p>
                <span className="text-[10px] text-ios-text-secondary mt-1">{new Date(n.createdAt).toLocaleDateString('pt-BR')} às {new Date(n.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </GlassCard>
            ))
          ) : (
            <div className="text-center py-20 opacity-30">
              <p>Nenhuma notificação por aqui.</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

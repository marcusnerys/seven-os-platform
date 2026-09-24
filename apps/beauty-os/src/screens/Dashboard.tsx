import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard, StatusBadge, Avatar, Modal, Button, Toast } from '../components/UI';
import { Logo } from '../components/Logo';
import { TrendingUp, Users, DollarSign, Calendar, ChevronRight, UserPlus, PlusCircle, Gift, MessageCircle, Bell, Lightbulb, Sparkles, Camera, RotateCw, Wind, Droplets } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { resolveMessage, openWhatsApp } from '../lib/whatsapp';
import { cn, dataLocal, ehAniversarioHoje } from '../lib/utils';
import { useStore } from '../lib/store';
import { getVertical } from '../lib/vertical';
import { useWeather } from '../hooks/useWeather';

export default function Dashboard() {
  const { setActiveTab, setModalToOpen, updateUserAvatar, getRevenueData, getRevenueForecast, getSmartInsight, clients, appointments, transactions, user, notifications, markNotificationAsRead, automationTemplates, setShowDevTools, settings } = useStore();
  const themeBg = useStore(state => state.themeBg);
  // Esta tela era a única que ignorava a vertical: falava sempre em cliente e
  // agendamento. Em Finanças Pessoais a navegação já esconde Agenda e
  // Clientes, mas o início continuava oferecendo os dois — e os atalhos
  // levavam a uma aba que o App devolve no mesmo instante.
  const vertical = getVertical(settings.businessType);
  const agenda = vertical.hasScheduling;
  // O tema claro é pintado por variável do Tailwind que não muda em runtime,
  // então a cor do texto precisa ser calculada aqui. Sem isto, texto branco
  // ficava sobre fundo quase branco (contraste 1.12, ilegível).
  const corTitulo = themeBg === 'light' ? '#1C1C1E' : '#FFFFFF';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localToast, setLocalToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.location.reload();
  };
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

  const { weather, loading: weatherLoading } = useWeather();
  const unreadCount = notifications.filter(n => !n.read).length;
  const revenueForecast = getRevenueForecast();

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setLocalToast({ message: 'A imagem deve ter menos de 5MB', type: 'error' });
      return;
    }

    // Aqui não havia aviso nenhum, nem de sucesso nem de falha: trocar a foto
    // e não ver nada acontecer era indistinguível de um erro de gravação.
    try {
      await updateUserAvatar(file);
      setLocalToast({ message: 'Foto atualizada', type: 'success' });
    } catch {
      setLocalToast({ message: 'Não foi possível salvar a foto. Tente novamente.', type: 'error' });
    }
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
  const today = dataLocal(now);
  const currentMonthDay = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  // Cancelados não contam como atendimento do dia. Com o botão Cancelar
  // agora marcando o status em vez de apagar, eles apareceriam no KPI.
  const todayAppointments = appointments.filter(a => a.date === today && a.status !== 'Cancelado');
  const totalRevenue = transactions.filter(t => t.type === 'revenue').reduce((acc, curr) => acc + curr.amount, 0);

  const birthdaysToday = clients.filter(c => ehAniversarioHoje(c.birthDate, today));

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = dataLocal(tomorrow);
  // Só quem ainda vem: o lembrete ia também para quem tinha cancelado.
  const tomorrowAppointments = appointments.filter(a =>
    a.date === tomorrowStr && (a.status === 'Confirmado' || a.status === 'Pendente')
  );
  const [proximoLembrete, setProximoLembrete] = useState(0);

  const handleSendBirthday = (client: any) => {
    const template = automationTemplates.find(t => t.type === 'birthday' && t.isActive);
    if (!template) {
      setLocalToast({ message: 'Ative a mensagem de aniversário em Automação para enviar os parabéns.', type: 'error' });
      return;
    }

    const message = resolveMessage(template.message, {
      nome: client.name,
      empresa: settings.studioName || 'Meu Negócio'
    });

    if (!openWhatsApp(client.phone, message)) {
      setLocalToast({ message: `${client.name} não tem telefone cadastrado.`, type: 'error' });
    }
  };

  // Um lembrete por toque, avançando na lista. O botão abria sempre o
  // WhatsApp do primeiro agendamento de amanhã: com cinco agendamentos, os
  // outros quatro nunca eram lembrados — e o card dizia "Lembrar Clientes".
  // Abrir várias conversas de uma vez o navegador bloqueia.
  const handleBulkReminders = () => {
    const template = automationTemplates.find(t => t.type === 'reminder' && t.isActive);
    if (!template) {
      setLocalToast({ message: 'Ative a mensagem de lembrete em Automação para enviar.', type: 'error' });
      return;
    }
    if (tomorrowAppointments.length === 0) return;

    const indice = proximoLembrete % tomorrowAppointments.length;
    const appt = tomorrowAppointments[indice];
    setProximoLembrete(indice + 1);
    const client = clients.find(c => c.id === appt.clientId);
    const phone = client?.phone || appt.clientPhone || '';

    const message = resolveMessage(template.message, {
      nome: client?.name || appt.clientName,
      servico: appt.service,
      data: 'amanhã',
      hora: appt.time,
      empresa: settings.studioName || 'Meu Negócio'
    });

    if (!openWhatsApp(phone, message)) {
      setLocalToast({ message: `${client?.name || appt.clientName || 'Esse agendamento'} não tem telefone válido. Toque de novo para o próximo.`, type: 'error' });
    }
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
            <span className="text-[11px] font-medium text-ios-text-secondary">Bem-vindo(a) de volta,</span>
            <h2 className="text-[20px] font-bold tracking-tightest" style={{ color: corTitulo }}>
              {settings.studioName || 'Meu Negócio'} ✨
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              title="Atualizar dados (F5)"
              className="p-2 rounded-full bg-white/5 border border-white/5 text-ios-text-secondary active:scale-95 transition-transform"
            >
              <motion.div animate={{ rotate: isRefreshing ? 360 : 0 }} transition={{ duration: 0.6 }}>
                <RotateCw size={18} />
              </motion.div>
            </button>
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
                src={user?.user_metadata?.avatar_url || undefined}
                fallback={user?.user_metadata?.full_name?.charAt(0) || 'U'} 
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

      {/* Weather Card */}
      <AnimatePresence>
        {(weather || weatherLoading) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard className="p-4 bg-white/[0.03] border-white/5 shrink-0 overflow-hidden relative">
              {weatherLoading ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="h-3 w-24 bg-white/5 rounded-full animate-pulse" />
                    <div className="h-2 w-40 bg-white/5 rounded-full animate-pulse" />
                  </div>
                </div>
              ) : weather ? (
                <>
                  {/* Subtle ambient glow */}
                  <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-10 blur-3xl"
                    style={{ background: weather.temp >= 26 ? '#FF9500' : weather.temp <= 16 ? '#00E6FF' : '#D4AF37' }}
                  />
                  <div className="flex items-center justify-between relative z-10">
                    {/* Left: emoji + temp + city */}
                    <div className="flex items-center gap-3">
                      <span className="text-[36px] leading-none select-none">{weather.emoji}</span>
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[28px] font-black text-white tracking-tighter leading-none">
                            {weather.temp}°
                          </span>
                          <span className="text-[13px] font-medium text-ios-text-secondary">C</span>
                        </div>
                        <p className="text-[11px] text-ios-text-secondary font-medium leading-tight">
                          {weather.condition} · {weather.city}
                        </p>
                      </div>
                    </div>
                    {/* Right: humidity + wind */}
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] text-ios-text-secondary">
                        <Droplets size={12} className="text-ios-cyan" />
                        <span>{weather.humidity}%</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-ios-text-secondary">
                        <Wind size={12} className="text-ios-gold" />
                        <span>{weather.windspeed} km/h</span>
                      </div>
                    </div>
                  </div>
                  {/* Beauty tip */}
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-start gap-2 relative z-10">
                    <Sparkles size={11} className="text-ios-gold shrink-0 mt-0.5" />
                    <p className="text-[11px] text-ios-text-secondary leading-snug">{weather.tip}</p>
                  </div>
                </>
              ) : null}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bible Verse Card */}
      <GlassCard className="p-5 bg-white/[0.03] border-white/5 flex items-start gap-4 min-h-[160px] shrink-0">
        <div className="w-12 h-12 rounded-[18px] bg-ios-gold/10 flex items-center justify-center text-ios-gold shrink-0 border border-ios-gold/20 shadow-[0_0_20px_rgba(230,192,139,0.1)]">
          <Sparkles size={22} className="opacity-90" />
        </div>
        <div className="flex flex-col flex-1 min-w-0 h-full">
          <span className="text-[10px] font-bold text-ios-gold uppercase tracking-[1.2px] opacity-70 mb-2">Palavra de Fé</span>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[80px]">
            <p className="text-[15px] text-ios-text-primary leading-[1.6] font-medium tracking-tight">
              "{verse.text}"
            </p>
          </div>
          <span className="text-[11px] font-bold text-ios-gold/60 self-end italic mt-2 shrink-0">— {verse.ref}</span>
        </div>
      </GlassCard>

      {/* Birthday Banner */}
      {agenda && birthdaysToday.length > 0 && (
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
                      <span className="text-[15px] font-extrabold" style={{ color: corTitulo }}>{birthdaysToday[0].name} 🎂</span>
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
                   + {birthdaysToday.length - 1} {vertical.clientNounPlural.toLowerCase()} também fazem aniversário hoje.
                </p>
             )}
          </GlassCard>
        </motion.div>
      )}

      {/* Reminder Banner */}
      {agenda && tomorrowAppointments.length > 0 && (
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
                      <span className="text-[15px] font-extrabold" style={{ color: corTitulo }}>{tomorrowAppointments.length} agendamentos</span>
                   </div>
                </div>
                <Button 
                   onClick={handleBulkReminders}
                   className="h-9 px-4 text-[11px] font-bold bg-ios-cyan text-ios-bg border-none shadow-none"
                >
                   <MessageCircle size={14} />
                   {tomorrowAppointments.length > 1
                     ? `Lembrar ${(proximoLembrete % tomorrowAppointments.length) + 1} de ${tomorrowAppointments.length}`
                     : 'Lembrar'}
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
          ...(agenda ? [
            { label: vertical.clientNounPlural, value: clients.length.toString(), icon: Users, color: 'gold', tab: 'clients' },
            { label: 'Hoje', value: todayAppointments.length.toString(), icon: Calendar, color: 'gold', tab: 'agenda' },
          ] : []),
          { label: 'Projeção/Mês', value: `R$ ${revenueForecast.toFixed(0)}`, icon: TrendingUp, color: 'cyan', tab: 'financial' },
          ...(agenda
            ? [{ label: 'Agenda Total', value: appointments.length.toString(), icon: UserPlus, color: 'gold', tab: 'agenda' }]
            : [{ label: 'Lançamentos', value: transactions.length.toString(), icon: DollarSign, color: 'gold', tab: 'financial' }]),
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
              ...(agenda ? [
                { id: 'appointment', label: 'Novo agendamento', icon: PlusCircle, tab: 'agenda' },
                { id: 'client', label: `Nov${vertical.clientGender === 'f' ? 'a' : 'o'} ${vertical.clientNoun.toLowerCase()}`, icon: UserPlus, tab: 'clients' },
              ] : []),
              { id: 'revenue', label: 'Registrar venda', icon: DollarSign, tab: 'financial' },
              { id: 'expense', label: 'Registrar despesa', icon: TrendingUp, tab: 'financial' },
              ...(agenda ? [{ id: 'agenda', label: 'Ver agenda', icon: Calendar, tab: 'agenda' }] : []),
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
                <p className="text-[13px] leading-snug whitespace-pre-line" style={{ color: corTitulo, opacity: 0.9 }}>{n.message}</p>
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

      <Toast
        isVisible={!!localToast}
        message={localToast?.message || ''}
        type={localToast?.type}
        onClose={() => setLocalToast(null)}
      />
    </div>
  );
}

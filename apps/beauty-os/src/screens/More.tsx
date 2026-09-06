import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard, Avatar, StatusBadge, Button, Toast, Modal } from '../components/UI';
import { Logo } from '../components/Logo';
import {
  Settings,
  CreditCard,
  ChevronRight,
  LogOut,
  Save,
  Globe,
  MapPin,
  Plus as PlusIcon,
  Trash2,
  MessageCircle,
  Camera,
  RefreshCw,
  Tag,
  Users,
  CalendarDays
} from 'lucide-react';
import { cn } from '../lib/utils';
import { applyTheme } from '../components/ThemeOnboarding';

import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { getVertical } from '../lib/vertical';

const ACCENT_COLORS = [
  { name: 'Dourado', value: '#D4AF37', neon: '#F5D062' },
  { name: 'Rosa',    value: '#FF6B9D', neon: '#FF2D78' },
  { name: 'Ciano',   value: '#00E6FF', neon: '#00C8FF' },
  { name: 'Laranja', value: '#FF7043', neon: '#FF4500' },
  { name: 'Roxo',    value: '#9B59B6', neon: '#A855F7' },
];

export default function More() {
  const user = useStore(state => state.user);
  const updateUserAvatar = useStore(state => state.updateUserAvatar);
  const themeAccent = useStore(state => state.themeAccent);
  const themeBg = useStore(state => state.themeBg);
  const setTheme = useStore(state => state.setTheme);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const services = useStore(state => state.services);
  const addService = useStore(state => state.addService);
  const deleteService = useStore(state => state.deleteService);
  const settings = useStore(state => state.settings);
  const updateSettings = useStore(state => state.updateSettings);
  const clients = useStore(state => state.clients);
  const addClient = useStore(state => state.addClient);
  const appointments = useStore(state => state.appointments);
  
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      setToast({ message: 'Apenas imagens JPEG, PNG, WebP ou GIF são permitidas', type: 'error' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setToast({ message: 'A imagem deve ter menos de 5MB', type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      await updateUserAvatar(base64String);
      setToast({ message: 'Logo atualizado com sucesso', type: 'success' });
    };
    reader.readAsDataURL(file);
  };
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [browserUrl, setBrowserUrl] = useState('');
  const setHasOnboarded = useStore(state => state.setHasOnboarded);
  const vertical = getVertical(settings.businessType);
  const isLight = themeBg === 'light';
  const textPrimary = isLight ? '#1C1C1E' : '#F5F5F7';
  const inputBg = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)';
  const inputBorder = isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)';

  const [newService, setNewService] = useState({ name: '', price: 0, duration: 60 });
  const [editSettings, setEditSettings] = useState(settings);

  const importPhoneContacts = async () => {
    const nav = navigator as any;
    if (!('contacts' in nav) || !('ContactsManager' in window)) {
      setToast({ message: 'Sincronização de contatos disponível apenas no navegador móvel (Chrome Android)', type: 'error' });
      return;
    }
    try {
      setLoadingAction('import-contacts');
      const picked = await nav.contacts.select(['name', 'tel', 'email'], { multiple: true });
      if (!picked || picked.length === 0) return;
      let added = 0;
      for (const c of picked) {
        const name = c.name?.[0] || '';
        const phone = (c.tel?.[0] || '').replace(/\D/g, '');
        const email = c.email?.[0] || '';
        if (!name) continue;
        const alreadyExists = clients.some(cl => cl.phone && cl.phone === phone);
        if (alreadyExists) continue;
        await addClient({ name, phone, email, tags: ['Importado'], isVIP: false, isFavorite: false });
        added++;
      }
      setToast({ message: added > 0 ? `${added} contato${added > 1 ? 's' : ''} importado${added > 1 ? 's' : ''}` : 'Nenhum contato novo para importar', type: 'success' });
    } catch (err: any) {
      if (err?.name !== 'TypeError') {
        setToast({ message: 'Erro ao importar contatos', type: 'error' });
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const exportCalendar = () => {
    const today = new Date().toISOString().split('T')[0];
    const upcoming = appointments.filter(a => a.date >= today && a.status !== 'Cancelado');
    if (upcoming.length === 0) {
      setToast({ message: 'Nenhum agendamento futuro para exportar', type: 'error' });
      return;
    }
    const pad = (n: string) => n.padStart(2, '0');
    const events = upcoming.map(appt => {
      const [y, m, d] = appt.date.split('-');
      const [h, min] = appt.time.split(':');
      const dtStart = `${y}${pad(m)}${pad(d)}T${pad(h)}${pad(min)}00`;
      const endMin = Number(h) * 60 + Number(min) + (appt.duration || 60);
      const endH = String(Math.floor(endMin / 60) % 24).padStart(2, '0');
      const endM = String(endMin % 60).padStart(2, '0');
      const dtEnd = `${y}${pad(m)}${pad(d)}T${endH}${endM}00`;
      const clientName = appt.clientName || clients.find(c => c.id === appt.clientId)?.name || 'Cliente';
      return [
        'BEGIN:VEVENT',
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${appt.service} - ${clientName}`,
        `DESCRIPTION:Serviço: ${appt.service}\\nCliente: ${clientName}\\nValor: R$ ${appt.price?.toFixed(2) || '0,00'}`,
        `STATUS:CONFIRMED`,
        `UID:${appt.id}@leshanotos`,
        'END:VEVENT',
      ].join('\r\n');
    });
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Leshanot OS//Agenda//PT', ...events, 'END:VCALENDAR'].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agenda-${today}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ message: `${upcoming.length} agendamento${upcoming.length > 1 ? 's' : ''} exportado${upcoming.length > 1 ? 's' : ''} para calendário`, type: 'success' });
  };

  useEffect(() => {
    setEditSettings(settings);
  }, [settings]);
  
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const openInAppBrowser = () => {
    if (!user) return;
    const link = `${window.location.origin}/book/${user.id}`;
    setBrowserUrl(link);
    setIsBrowserOpen(true);
  };

  const copyBookingLink = () => {
    if (!user) return;
    const link = `${window.location.origin}/book/${user.id}`;
    navigator.clipboard.writeText(link);
    setToast({ message: "Link copiado para a área de transferência", type: 'success' });
  };

  const handleSaveSettings = async () => {
    setLoadingAction('save-settings');
    try {
      await updateSettings(editSettings);
      setIsSettingsOpen(false);
      setToast({ message: "Configurações salvas com sucesso", type: 'success' });
    } catch (err) {
      setToast({ message: "Erro ao salvar", type: 'error' });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAddService = async () => {
    if (!newService.name || !newService.price) return;
    setLoadingAction('add-service');
    try {
      await addService(newService);
      setNewService({ name: '', price: 0, duration: 60 });
      setToast({ message: "Serviço adicionado", type: 'success' });
    } catch (err) {
      setToast({ message: "Erro ao adicionar serviço", type: 'error' });
    } finally {
      setLoadingAction(null);
    }
  };

  const sections = [
    {
      title: 'Negócio',
      items: [
        { label: vertical.serviceNounPlural, icon: Tag, color: 'text-ios-gold', action: () => setIsServicesOpen(true), badge: services.length.toString() },
        ...(vertical.hasScheduling ? [
          { label: 'Link de Agendamento', icon: Globe, color: 'text-ios-cyan', action: openInAppBrowser },
          { label: 'Automação WhatsApp', icon: MessageCircle, color: 'text-ios-gold', action: () => useStore.getState().setActiveTab('automation') },
        ] : []),
      ]
    },
    {
      title: 'Ferramentas',
      items: [
        { label: 'Importar Contatos do Celular', icon: Users, color: 'text-ios-cyan', action: importPhoneContacts },
        ...(vertical.hasScheduling ? [
          { label: 'Exportar Agenda p/ Calendário', icon: CalendarDays, color: 'text-ios-gold', action: exportCalendar, badge: String(appointments.filter(a => a.date >= new Date().toISOString().split('T')[0] && a.status !== 'Cancelado').length) },
        ] : []),
      ]
    },
    {
      title: 'Conta',
      items: [
        { label: `Configurações do ${vertical.businessNoun}`, icon: Settings, color: 'text-ios-text-secondary', action: () => setIsSettingsOpen(true) },
        { label: 'Refazer configuração inicial', icon: RefreshCw, color: 'text-ios-text-secondary', action: () => setHasOnboarded(false) },
        { label: 'Plano Premium', icon: CreditCard, color: 'text-ios-gold', badge: 'Ativo' },
      ]
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto hide-scrollbar pb-12">
      <div className="p-6 pb-2 mt-4">
        <div className="flex items-center justify-between mb-8">
          <Logo size="sm" />
          <div className="p-2 -mr-2 text-ios-gold">
            <Settings size={20} />
          </div>
        </div>

        {/* User Card */}
        <GlassCard className="p-5 flex items-center gap-4 bg-ios-surface border-none mb-8">
           <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
             <Avatar 
               src={user?.user_metadata?.avatar_url || undefined}
               fallback={user?.user_metadata?.full_name?.charAt(0) || 'U'} 
               size="lg" 
             />
             <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
               <Camera size={16} className="text-white" />
             </div>
             <input 
               type="file" 
               ref={fileInputRef} 
               className="hidden" 
               accept="image/*" 
               onChange={handleFileChange} 
             />
           </div>
           <div className="flex-1">
             <h3 className="text-[18px] font-bold text-ios-text-primary tracking-tightest">
               {user?.user_metadata?.full_name || 'Usuário'}
             </h3>
             <p className="text-[12px] text-ios-text-secondary font-medium">
               {user?.email || 'studio@leshanot.com'}
             </p>
             <div className="flex mt-2">
                <StatusBadge label="Assinante Pro" variant="vip" />
             </div>
           </div>
        </GlassCard>

        {/* Dynamic Sections */}
        <div className="flex flex-col gap-8">
          {sections.map((section, sidx) => (
            <div key={sidx} className="flex flex-col gap-3">
              <h4 className="text-[11px] font-bold text-ios-text-secondary uppercase tracking-widest px-2">{section.title}</h4>
              <div className="flex flex-col gap-1">
                {section.items.map((item, iidx) => {
                  const isLoading = loadingAction === item.label;
                  return (
                    <GlassCard
                      key={iidx}
                      onClick={(item as any).action}
                      className="p-4 flex items-center justify-between border-none active:bg-white/5 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                         <div className={cn("w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center", item.color)}>
                            {isLoading ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <item.icon size={18} />
                            )}
                         </div>
                         <span className="text-[15px] font-medium text-ios-text-primary">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                         {item.badge && <StatusBadge label={item.badge} variant="ios" />}
                         <ChevronRight size={16} className="text-ios-text-secondary opacity-30" />
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Logout Section */}
          <div className="mt-4 px-2">
            <Button 
              variant="secondary" 
              className="w-full text-red-400 border-red-400/10 bg-red-400/5 active:scale-[0.98] transition-transform"
              onClick={handleLogout}
            >
              <LogOut size={18} />
              Sair da conta
            </Button>
            <p className="text-center text-[10px] text-ios-text-secondary mt-6 font-medium tracking-widest uppercase opacity-40">
              LESHANOT STUDIO v2.4.1
            </p>
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {isServicesOpen && (
          <Modal 
            isOpen={isServicesOpen} 
            onClose={() => setIsServicesOpen(false)} 
            title="Gestão de Serviços"
          >
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                <h4 className="text-[12px] font-bold text-ios-gold uppercase tracking-wider">Novo Serviço</h4>
                <div className="flex flex-col gap-3">
                  <input 
                    placeholder="Nome do serviço" 
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none"
                    style={{ color: textPrimary, background: inputBg, borderColor: inputBorder }}
                    value={newService.name}
                    onChange={e => setNewService({ ...newService, name: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      type="number"
                      placeholder="Preço (R$)"
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none"
                      style={{ color: textPrimary, background: inputBg, borderColor: inputBorder }}
                      value={newService.price || ''}
                      onChange={e => setNewService({ ...newService, price: parseFloat(e.target.value) })}
                    />
                    <input 
                      type="number"
                      placeholder="Minutos"
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none"
                      style={{ color: textPrimary, background: inputBg, borderColor: inputBorder }}
                      value={newService.duration || ''}
                      onChange={e => setNewService({ ...newService, duration: parseInt(e.target.value) })}
                    />
                  </div>
                  <Button onClick={handleAddService} loading={loadingAction === 'add-service'} className="h-14">
                    <PlusIcon size={18} />
                    Adicionar Serviço
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1 mb-1">
                  <h4 className="text-[12px] font-bold text-ios-text-secondary uppercase tracking-wider">Seus Serviços ({services.length})</h4>
                </div>
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto px-1 hide-scrollbar">
                  {services.map(s => (
                    <div key={s.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                      <div>
                        <p className="font-bold leading-tight" style={{ color: textPrimary }}>{s.name}</p>
                        <p className="text-[12px] text-ios-text-secondary font-medium">R$ {s.price} • {s.duration} min</p>
                      </div>
                      <button 
                        onClick={() => deleteService(s.id)}
                        className="p-2 text-red-400/50 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Modal>
        )}

        {isSettingsOpen && (
          <Modal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
            title="Configurações"
            footer={
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" className="h-14" onClick={() => setIsSettingsOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  className="h-14"
                  onClick={handleSaveSettings} 
                  loading={loadingAction === 'save-settings'}
                >
                  Salvar
                </Button>
              </div>
            }
          >
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-ios-text-secondary uppercase px-1">{vertical.businessNameLabel}</label>
                  <div className="relative">
                    <Settings className="absolute left-4 top-1/2 -translate-y-1/2 text-ios-text-secondary opacity-40" size={16} />
                    <input 
                      type="text" 
                      className="w-full rounded-xl pl-11 pr-4 py-3 focus:outline-none"
                      style={{ color: textPrimary, background: inputBg, border: `1px solid ${inputBorder}` }}
                      value={editSettings.studioName}
                      onChange={e => setEditSettings({ ...editSettings, studioName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-ios-text-secondary uppercase px-1">Localização</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-ios-text-secondary opacity-40" size={16} />
                    <input 
                      type="text" 
                      className="w-full rounded-xl pl-11 pr-4 py-3 focus:outline-none"
                      style={{ color: textPrimary, background: inputBg, border: `1px solid ${inputBorder}` }}
                      value={editSettings.location}
                      onChange={e => setEditSettings({ ...editSettings, location: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-ios-text-secondary uppercase px-1">Moeda / Região</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-ios-text-secondary opacity-40" size={16} />
                    <select
                      className="w-full rounded-xl pl-11 pr-4 py-3 focus:outline-none appearance-none"
                      style={{ color: textPrimary, background: inputBg, border: `1px solid ${inputBorder}` }}
                      value={editSettings.currency}
                      onChange={e => setEditSettings({ ...editSettings, currency: e.target.value })}
                    >
                      <option value="BRL" className="bg-[#121214]">Real Brasileiro (BRL)</option>
                      <option value="USD" className="bg-[#121214]">Dólar Americano (USD)</option>
                      <option value="EUR" className="bg-[#121214]">Euro (EUR)</option>
                    </select>
                  </div>
                </div>

                {/* Theme section */}
                <div className="flex flex-col gap-3 pt-2 border-t border-white/5">
                  <label className="text-[10px] font-bold text-ios-text-secondary uppercase px-1">Tema do App</label>

                  {/* Background toggle */}
                  <div className="grid grid-cols-2 gap-2">
                    {(['dark', 'light'] as const).map(bg => (
                      <button
                        key={bg}
                        type="button"
                        onClick={() => setTheme(themeAccent, bg)}
                        className={cn(
                          "h-10 rounded-xl text-[13px] font-bold border-2 transition-all",
                          themeBg === bg ? "border-ios-gold" : "border-white/10 opacity-50"
                        )}
                        style={{ background: bg === 'dark' ? '#0B0B0D' : '#F2F2F7', color: bg === 'dark' ? '#F5F5F7' : '#1C1C1E' }}
                      >
                        {bg === 'dark' ? '🌙 Escuro' : '☀️ Claro'}
                      </button>
                    ))}
                  </div>

                  {/* Accent color picker */}
                  <div className="flex gap-3 justify-center pt-1">
                    {ACCENT_COLORS.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setTheme(c.value, themeBg)}
                        className={cn(
                          "w-9 h-9 rounded-full border-2 transition-all active:scale-90",
                          themeAccent === c.value ? "border-white scale-110" : "border-transparent"
                        )}
                        style={{
                          background: `radial-gradient(circle at 30% 30%, ${c.neon}, ${c.value})`,
                          boxShadow: themeAccent === c.value ? `0 0 14px ${c.value}80` : undefined,
                        }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {isBrowserOpen && (
          <Modal 
            isOpen={isBrowserOpen} 
            onClose={() => setIsBrowserOpen(false)} 
            title="Sua Página de Agendamento"
            footer={
              <div className="flex gap-3">
                <Button 
                  variant="secondary" 
                  className="flex-1 h-14" 
                  onClick={copyBookingLink}
                >
                  <Save size={18} />
                  Copiar Link
                </Button>
                <Button 
                  className="flex-1 h-14" 
                  onClick={() => setIsBrowserOpen(false)}
                >
                  Fechar
                </Button>
              </div>
            }
          >
            <div className="w-full h-[60vh] rounded-2xl overflow-hidden bg-white/5 border border-white/10">
              <iframe
                src={browserUrl}
                className="w-full h-full border-none"
                title="Booking Page"
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <Toast 
        isVisible={!!toast} 
        message={toast?.message || ''} 
        type={toast?.type} 
        onClose={() => setToast(null)} 
      />
    </div>
  );
}

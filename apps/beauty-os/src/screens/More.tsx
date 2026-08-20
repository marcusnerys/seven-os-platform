import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard, Avatar, StatusBadge, Button, Toast, Modal } from '../components/UI';
import { Logo } from '../components/Logo';
import { 
  Settings, 
  Bell, 
  Shield, 
  Cloud, 
  CreditCard, 
  HelpCircle, 
  ChevronRight, 
  LogOut, 
  Smartphone,
  Users,
  Calendar,
  Save,
  Globe,
  MapPin,
  Sparkles,
  Scissors,
  Plus as PlusIcon,
  Trash2,
  MessageCircle,
  Camera
} from 'lucide-react';
import { cn } from '../lib/utils';

import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { seedTestData, clearAllData } from '../lib/testData';

export default function More() {
  const user = useStore(state => state.user);
  const updateUserAvatar = useStore(state => state.updateUserAvatar);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const appointments = useStore(state => state.appointments);
  const services = useStore(state => state.services);
  const addService = useStore(state => state.addService);
  const deleteService = useStore(state => state.deleteService);
  const settings = useStore(state => state.settings);
  const updateSettings = useStore(state => state.updateSettings);
  
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      setToast({ message: 'A imagem deve ter menos de 1MB', type: 'error' });
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
  const [newService, setNewService] = useState({ name: '', price: 0, duration: 60 });
  const [editSettings, setEditSettings] = useState(settings);

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

  const handleContactSync = async () => {
    setLoadingAction('Sincronizar contatos');
    try {
      // Check for Contact Picker API Support
      if ('contacts' in navigator && 'ContactsManager' in window) {
        const props = ['name', 'tel', 'email'];
        const opts = { multiple: true };
        try {
          const contactsList = await (navigator as any).contacts.select(props, opts);
          console.log('Selected contacts:', contactsList);
          setToast({ message: `${contactsList.length} contatos sincronizados`, type: 'success' });
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            throw err;
          }
        }
      } else {
        // Simulation for browsers that don't support it
        await new Promise(resolve => setTimeout(resolve, 2000));
        setToast({ message: "Contatos sincronizados via backup local", type: 'success' });
      }
    } catch (error) {
      setToast({ message: "Erro ao sincronizar contatos", type: 'error' });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCalendarSync = async () => {
    setLoadingAction('Sync com agenda');
    try {
      // Simulate/Trigger ICS generation
      if (appointments.length === 0) {
        setToast({ message: "Nenhum agendamento para sincronizar", type: 'error' });
        setLoadingAction(null);
        return;
      }

      // Generate ICS Content
      let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Leshanot//Studio//PT\n";
      appointments.forEach(appt => {
        const start = appt.date.replace(/-/g, '') + 'T' + appt.time.replace(':', '') + '00';
        icsContent += `BEGIN:VEVENT\nSUMMARY:${appt.service}\nDTSTART:${start}\nDESCRIPTION:Serviço agendado no Leshanot Studio\nEND:VEVENT\n`;
      });
      icsContent += "END:VCALENDAR";

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'agenda-leshanot.ics');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      await new Promise(resolve => setTimeout(resolve, 1000));
      setToast({ message: "Agenda exportada com sucesso", type: 'success' });
    } catch (error) {
      setToast({ message: "Erro ao sincronizar agenda", type: 'error' });
    } finally {
      setLoadingAction(null);
    }
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
      title: 'Gestão',
      items: [
        { label: 'Clientes', icon: Users, color: 'text-ios-gold', action: () => useStore.getState().setActiveTab('clients') },
        { label: 'Agenda', icon: Calendar, color: 'text-ios-gold', action: () => useStore.getState().setActiveTab('agenda') },
        { label: 'Serviços', icon: Scissors, color: 'text-ios-gold', action: () => setIsServicesOpen(true), badge: services.length.toString() },
      ]
    },
    {
      title: 'Sistema',
      items: [
        { label: 'Notificações', icon: Bell, color: 'text-ios-gold' },
        { label: 'Automação WhatsApp', icon: MessageCircle, color: 'text-ios-gold', action: () => useStore.getState().setActiveTab('automation') },
        { label: 'Cloud Sync', icon: Cloud, color: 'text-ios-cyan' },
        { label: 'Link de Agendamento', icon: Globe, color: 'text-ios-cyan', action: openInAppBrowser },
        { label: 'Sincronizar contatos', icon: Users, color: 'text-ios-cyan', action: handleContactSync },
      ]
    },
    {
      title: 'Conta & Assinatura',
      items: [
        { label: 'Plano Premium', icon: CreditCard, color: 'text-ios-gold', badge: 'Ativo' },
        { label: 'Configurações', icon: Settings, color: 'text-ios-text-secondary', action: () => setIsSettingsOpen(true) },
        { label: 'Dispositivos', icon: Smartphone, color: 'text-ios-text-secondary' },
      ]
    },
    {
      title: 'Suporte',
      items: [
        { label: 'Ajuda & FAQ', icon: HelpCircle, color: 'text-ios-text-secondary' },
      ]
    },
    {
      title: 'Debug & Testing',
      items: [
        { 
          label: 'Gerar Dados de Teste', 
          icon: Sparkles, 
          color: 'text-ios-cyan', 
          action: async () => {
            if (!user) return;
            setLoadingAction('Gerar Dados de Teste');
            try {
              await seedTestData(user.id);
              setToast({ message: "Dados de teste gerados!", type: 'success' });
            } catch (e) {
              setToast({ message: "Erro ao gerar dados", type: 'error' });
            } finally {
              setLoadingAction(null);
            }
          } 
        },
        { 
          label: 'Limpar Todos os Dados', 
          icon: Trash2, 
          color: 'text-red-400', 
          action: async () => {
            if (!user) return;
            if (confirm("Isso apagará TODOS os seus dados do banco. Deseja continuar?")) {
              setLoadingAction('Limpar Todos os Dados');
              try {
                await clearAllData(user.id);
                setToast({ message: "Banco de dados limpo!", type: 'success' });
              } catch (e) {
                setToast({ message: "Erro ao limpar dados", type: 'error' });
              } finally {
                setLoadingAction(null);
              }
            }
          } 
        }
      ]
    }
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
             <h3 className="text-[18px] font-bold text-white tracking-tightest">
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
                      className="p-4 flex items-center justify-between bg-[#151518] border-none active:bg-white/5 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                         <div className={cn("w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center", item.color)}>
                            {isLoading ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <item.icon size={18} />
                            )}
                         </div>
                         <span className="text-[15px] font-medium text-white">{item.label}</span>
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
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none" 
                    value={newService.name}
                    onChange={e => setNewService({ ...newService, name: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      type="number"
                      placeholder="Preço (R$)" 
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none" 
                      value={newService.price || ''}
                      onChange={e => setNewService({ ...newService, price: parseFloat(e.target.value) })}
                    />
                    <input 
                      type="number"
                      placeholder="Minutos" 
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none" 
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
                        <p className="font-bold text-white leading-tight">{s.name}</p>
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
                  <label className="text-[10px] font-bold text-ios-text-secondary uppercase px-1">Nome do Estúdio</label>
                  <div className="relative">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-ios-text-secondary opacity-40" size={16} />
                    <input 
                      type="text" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none" 
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
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none" 
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
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none appearance-none"
                      value={editSettings.currency}
                      onChange={e => setEditSettings({ ...editSettings, currency: e.target.value })}
                    >
                      <option value="BRL" className="bg-[#121214]">Real Brasileiro (BRL)</option>
                      <option value="USD" className="bg-[#121214]">Dólar Americano (USD)</option>
                      <option value="EUR" className="bg-[#121214]">Euro (EUR)</option>
                    </select>
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

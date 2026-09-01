import React, { useState, useEffect, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard, Avatar, StatusBadge, Modal, Button, Toast, Input } from '../components/UI';
import { Logo } from '../components/Logo';
import { Search, Plus, Filter, Heart, ChevronRight, MessageCircle, Phone, Mail, Calendar, TrendingUp, Star as StarIcon, Tag, Trash2, CalendarCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore, Client } from '../lib/store';
import { resolveMessage, openWhatsApp } from '../lib/whatsapp';

export default function Clients() {
  const { clients, toggleFavorite, addClient, updateClient, deleteClient, modalToOpen, modalData, setModalToOpen, automationTemplates } = useStore();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'favorite' | 'vip'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  useEffect(() => {
    if (modalToOpen === 'client') {
      if (modalData) {
        setNewClient(prev => ({ ...prev, ...modalData }));
      }
      setIsAddModalOpen(true);
      setModalToOpen(null);
    }
  }, [modalToOpen, modalData, setModalToOpen]);
  
  // New Client Form State
  const [newClient, setNewClient] = useState({ name: '', phone: '', email: '', tags: '', birthDate: '' });
  const [phoneError, setPhoneError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [whatsappPrompt, setWhatsappPrompt] = useState<{ phone: string, message: string, title?: string } | null>(null);

  const syncBirthdayToCalendar = (client: Client) => {
    if (!client.birthDate) {
      setToast({ message: "Aniversário não cadastrado", type: 'error' });
      return;
    }

    const [year, month, day] = client.birthDate.split('-');
    const dtstart = `${year}${month}${day}`;
    const uid = `birthday-${client.id}@leshanot`;
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Leshanot Beauty OS//PT',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${dtstart}`,
      `RRULE:FREQ=YEARLY`,
      `SUMMARY:🎂 Aniversário - ${client.name}`,
      `DESCRIPTION:Cliente do Leshanot Studio\\nTelefone: ${client.phone}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT0S',
      'ACTION:DISPLAY',
      `DESCRIPTION:🎂 Hoje é aniversário de ${client.name}!`,
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aniversario-${client.name.toLowerCase().replace(/\s+/g, '-')}.ics`;
    a.click();
    URL.revokeObjectURL(url);

    setToast({ message: `Aniversário de ${client.name} exportado!`, type: 'success' });
  };

  const triggerAutomation = (type: string, clientData: any) => {
    const template = automationTemplates.find(t => t.type === type && t.isActive);
    if (!template) return;

    const message = resolveMessage(template.message, {
      nome: clientData.name,
      empresa: 'LESHANOT STUDIO'
    });

    setWhatsappPrompt({ phone: clientData.phone, message, title: template.title });
  };

  // Get all unique tags from clients
  // Get all unique tags from clients
  const allTags = Array.from(new Set(clients.flatMap(c => c.tags || [])));
  const clientFallback = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 10) {
      return digits
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .slice(0, 14);
    } else {
      return digits
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .slice(0, 15);
    }
  };

  const isPhoneValid = (phone: string) => {
    const regex = /^\(\d{2}\) \d{4,5}-\d{4}$/;
    return regex.test(phone);
  };

  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setNewClient({ ...newClient, phone: formatted });
    if (formatted.length > 0) {
      setPhoneError(!isPhoneValid(formatted));
    } else {
      setPhoneError(false);
    }
  };

  const handleAddClient = async () => {
    if (!newClient.name || !newClient.phone) return;
    
    if (!isPhoneValid(newClient.phone)) {
      setPhoneError(true);
      setToast({ message: "Formato de telefone inválido", type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingClient) {
        await updateClient(editingClient.id, {
          name: newClient.name,
          phone: newClient.phone,
          email: newClient.email || '',
          birthDate: newClient.birthDate || '',
          tags: newClient.tags ? newClient.tags.split(',').map(t => t.trim()) : [],
        });
        setToast({ message: "Cliente atualizado", type: 'success' });
      } else {
        await addClient({
          name: newClient.name,
          phone: newClient.phone,
          email: newClient.email || '',
          birthDate: newClient.birthDate || '',
          tags: newClient.tags ? newClient.tags.split(',').map(t => t.trim()) : [],
          isVIP: false,
          isFavorite: false
        });
        setToast({ message: "Cliente salvo com sucesso", type: 'success' });
        triggerAutomation('welcome', newClient);
      }
      setIsAddModalOpen(false);
      setEditingClient(null);
      setNewClient({ name: '', phone: '', email: '', tags: '', birthDate: '' });

      // VIP Promotion Logic (Check if newly added/updated client qualifies)
      // Note: For a new client spent is 0, so only updates for existing clients would really trigger this.
      // Or we can check all clients periodically, but doing it here is efficient for the current user.
      const threshold = 500;
      clients.forEach(async (c) => {
        if (!c.isVIP && (c.spent || 0) >= threshold) {
          await updateClient(c.id, { isVIP: true });
          setToast({ message: `${c.name} agora é uma Cliente VIP! ✨`, type: 'success' });
        }
      });
    } catch (error) {
      console.error(error);
      setToast({ message: "Erro ao salvar cliente", type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    const matchesFilter = 
      filterType === 'all' ? true :
      filterType === 'favorite' ? c.isFavorite :
      filterType === 'vip' ? c.isVIP : true;
    
    const matchesTag = selectedTag ? c.tags?.includes(selectedTag) : true;
    
    return matchesSearch && matchesFilter && matchesTag;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-6 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-2 mt-4">
          <Logo size="sm" />
          <h1 className="text-[18px] font-bold tracking-tightest uppercase text-ios-text-secondary opacity-40">Clientes</h1>
        </div>

        {/* Search Bar Immersive */}
        <div className="relative mb-4 shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ios-text-secondary opacity-40 z-10" size={16} />
          <Input 
            voice
            placeholder="Buscar clientes..."
            className="pl-11 h-11 text-[13px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto hide-scrollbar -mx-6 px-6 shrink-0">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'favorite', label: 'Favoritas', icon: Heart },
            { id: 'vip', label: 'VIPs', icon: StarIcon },
          ].map((f) => {
            const isActive = filterType === f.id;
            const Icon = (f as any).icon;
            return (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id as any)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                  isActive 
                    ? "bg-ios-gold text-ios-bg shadow-lg shadow-ios-gold/20" 
                    : "bg-white/5 text-ios-text-secondary border border-white/10"
                )}
              >
                {Icon && <Icon size={12} fill={isActive && f.id === 'favorite' ? 'currentColor' : 'none'} />}
                {f.label}
              </button>
            );
          })}

          {allTags.length > 0 && <div className="w-[1px] h-4 bg-white/10 mx-1 shrink-0" />}

          {allTags.map((tag) => {
            const isActive = selectedTag === tag;
            return (
              <button
                key={tag}
                onClick={() => setSelectedTag(isActive ? null : tag)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                  isActive 
                    ? "bg-[#00E6FF] text-ios-bg shadow-lg shadow-[#00E6FF]/20" 
                    : "bg-white/5 text-ios-text-secondary border border-white/10"
                )}
              >
                <Tag size={12} />
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Client List */}
      <div className="flex-1 overflow-y-auto px-6 pb-12 hide-scrollbar">
        <div className="flex flex-col gap-1">
          {filteredClients.map((client) => (
            <div 
              key={client.id} 
              onClick={() => setSelectedClient(client)}
              className="flex items-center gap-4 py-3 border-b border-white/5 group active:opacity-60 transition-all cursor-pointer hover:bg-white/[0.02] -mx-2 px-2 rounded-xl"
            >
              <Avatar fallback={client.name.split(' ').map(n => n[0]).join('')} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <h4 className="text-[14px] font-bold tracking-tightest truncate text-white">{client.name}</h4>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(client.id);
                      }}
                      className="p-1 -m-1 group/heart active:scale-125 transition-transform shrink-0"
                    >
                      <Heart 
                        size={14} 
                        className={cn(
                          "transition-colors",
                          client.isFavorite ? "text-ios-gold fill-ios-gold" : "text-white/20 group-hover/heart:text-white/40"
                        )} 
                      />
                    </button>
                  </div>
                  {client.isVIP ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusBadge label="VIP" variant="vip" />
                      <StarIcon size={12} className="text-ios-gold fill-ios-gold shadow-[0_0_8px_rgba(230,192,139,0.5)]" />
                    </div>
                  ) : (
                    <StatusBadge label="Cliente" variant="default" />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                   <p className="text-[11px] text-ios-text-secondary font-medium tracking-tight opacity-60">Última visita: {client.lastVisit || 'Nunca'}</p>
                   {client.isFavorite && <div className="w-1 h-1 rounded-full bg-ios-gold shadow-[0_0_5px_rgba(230,192,139,0.5)]" />}
                   {client.tags?.slice(0, 2).map((tag, i) => (
                     <span key={i} className="px-1.5 py-0.5 rounded-sm bg-white/5 text-[9px] uppercase font-bold text-ios-text-secondary border border-white/5">
                       {tag}
                     </span>
                   ))}
                </div>
              </div>
              <ChevronRight size={14} className="text-ios-text-secondary opacity-30 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
          {filteredClients.length === 0 && (
            <div className="text-center py-16 flex flex-col items-center gap-4">
              {clients.length === 0 ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center opacity-30">
                    <Plus size={32} />
                  </div>
                  <div className="opacity-40">
                    <p className="text-[14px] font-bold text-white mb-1">Nenhuma cliente ainda</p>
                    <p className="text-[11px] text-white/50 leading-relaxed">Toque no <span className="text-ios-gold">+</span> para cadastrar<br />sua primeira cliente</p>
                  </div>
                </>
              ) : (
                <>
                  <Search size={40} className="opacity-20" />
                  <p className="text-[11px] font-bold uppercase tracking-widest opacity-20">Nenhuma cliente encontrada</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <button 
        onClick={() => setIsAddModalOpen(true)}
        className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-ios-gold flex items-center justify-center text-ios-bg shadow-[0_10px_20px_rgba(230,192,139,0.3)] active:scale-95 transition-transform z-30"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {/* Client Profile Modal */}
      <AnimatePresence>
        {selectedClient && (
          <Modal 
            isOpen={!!selectedClient} 
            onClose={() => setSelectedClient(null)} 
            title="Perfil da Cliente"
            footer={
              <div className="flex flex-col gap-3">
                <div className="flex gap-4">
                  <Button variant="secondary" className="flex-1 h-14" onClick={() => {
                    const phone = selectedClient.phone.replace(/\D/g, '');
                    window.open(`https://wa.me/55${phone}`, '_blank');
                  }}>
                    <MessageCircle size={20} />
                    WhatsApp
                  </Button>
                  <Button 
                    variant={selectedClient.isFavorite ? 'primary' : 'secondary'} 
                    className="flex-1 h-14"
                    onClick={() => toggleFavorite(selectedClient.id)}
                  >
                    <Heart size={20} fill={selectedClient.isFavorite ? "currentColor" : "none"} />
                    {selectedClient.isFavorite ? 'Favorita' : 'Favoritar'}
                  </Button>
                </div>
                <div className="flex gap-4">
                  <Button variant="secondary" className="flex-1 h-14" onClick={() => {
                    setNewClient({
                      name: selectedClient.name,
                      phone: selectedClient.phone,
                      email: selectedClient.email || '',
                      tags: selectedClient.tags?.join(', ') || '',
                      birthDate: selectedClient.birthDate || ''
                    });
                    setEditingClient(selectedClient);
                    setSelectedClient(null);
                    setIsAddModalOpen(true);
                  }}>
                    Editar
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="flex-1 text-red-100 hover:text-red-400 border border-red-900/20 h-14"
                    onClick={() => {
                      if (confirm(`Excluir ${selectedClient.name}?`)) {
                        deleteClient(selectedClient.id);
                        setSelectedClient(null);
                      }
                    }}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            }
          >
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center gap-3">
                <Avatar fallback={clientFallback(selectedClient.name)} size="lg" />
                <div className="text-center">
                  <h3 className="text-[20px] font-bold text-white">{selectedClient.name}</h3>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    {selectedClient.isVIP && (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-ios-gold/10 border border-ios-gold/20 rounded-full mb-1">
                        <StarIcon size={14} className="text-ios-gold fill-ios-gold shadow-[0_0_10px_rgba(230,192,139,0.3)]" />
                        <span className="text-[10px] font-black uppercase text-ios-gold tracking-[1.5px]">CLIENTE VIP</span>
                      </div>
                    )}
                    {!selectedClient.isVIP && (
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-ios-text-secondary">{selectedClient.phone}</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(selectedClient.phone);
                            setToast({ message: "Número copiado!", type: 'success' });
                          }}
                          className="p-1 text-ios-text-secondary hover:text-white active:scale-75 transition-all"
                        >
                          <Phone size={12} className="opacity-50" />
                        </button>
                      </div>
                    )}
                  </div>
                  {selectedClient.isVIP && (
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <span className="text-[13px] text-ios-text-secondary">{selectedClient.phone}</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(selectedClient.phone);
                            setToast({ message: "Número copiado!", type: 'success' });
                          }}
                          className="p-1 text-ios-text-secondary hover:text-white active:scale-75 transition-all"
                        >
                          <Phone size={12} className="opacity-50" />
                        </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <GlassCard className="p-4 flex flex-col gap-1 bg-white/5 border-none">
                  <span className="text-[10px] text-ios-text-secondary font-bold uppercase tracking-wider">Total Gasto</span>
                  <span className="text-[16px] font-bold text-ios-gold">R$ {(selectedClient.spent || 0).toFixed(2)}</span>
                </GlassCard>
                <GlassCard className="p-4 flex flex-col gap-1 bg-white/5 border-none">
                  <span className="text-[10px] text-ios-text-secondary font-bold uppercase tracking-wider">Visitas</span>
                  <span className="text-[16px] font-bold text-white">{selectedClient.visits || 0}</span>
                </GlassCard>
              </div>

               <div className="flex flex-col gap-3">
                <h4 className="text-[12px] font-bold text-ios-text-secondary uppercase">Ações de Relacionamento</h4>
                <div className="grid grid-cols-2 gap-3">
                   <Button 
                     variant="secondary" 
                     className="h-12 bg-ios-gold/10 border-ios-gold/20 text-ios-gold"
                     onClick={() => triggerAutomation('welcome', selectedClient)}
                   >
                      <StarIcon size={18} className="mr-1" />
                      Boas-vindas
                   </Button>
                   <Button 
                     variant="secondary" 
                     className="h-12 bg-ios-cyan/5 border-ios-cyan/10 text-ios-cyan"
                     onClick={() => openWhatsApp(selectedClient.phone, resolveMessage("Olá, {{nome}}! ✨", { nome: selectedClient.name }))}
                   >
                      <MessageCircle size={18} />
                      Conversar
                   </Button>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h4 className="text-[12px] font-bold text-ios-text-secondary uppercase">Informações</h4>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3">
                      <Mail size={16} className="text-ios-gold opacity-50" />
                      <span className="text-sm text-white/80">{selectedClient.email || 'Não informado'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3">
                      <Calendar size={16} className="text-ios-gold opacity-50" />
                      <span className="text-sm text-white/80">{selectedClient.birthDate ? selectedClient.birthDate.split('-').reverse().join('/') : 'Aniversário não informado'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3 mb-1">
                      <Tag size={16} className="text-ios-gold opacity-50" />
                      <span className="text-sm text-white/80">Categorias</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedClient.tags?.map(t => (
                        <StatusBadge key={t} label={t} variant="ios" />
                      )) || <span className="text-[11px] text-white/40">Nenhuma tag</span>}
                    </div>
                  </div>
                </div>
              </div>

              {selectedClient.birthDate && (
                <Button
                  variant="secondary"
                  className="w-full h-12 bg-ios-gold/5 border-ios-gold/20 text-ios-gold gap-2"
                  onClick={() => syncBirthdayToCalendar(selectedClient)}
                >
                  <CalendarCheck size={18} />
                  Sincronizar Aniversário com Agenda
                </Button>
              )}
            </div>
          </Modal>
        )}

        {isAddModalOpen && (
          <Modal 
            isOpen={isAddModalOpen} 
            onClose={() => {
              setIsAddModalOpen(false);
              setEditingClient(null);
            }} 
            title={editingClient ? "Editar Cliente" : "Nova Cliente"}
            footer={
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingClient(null);
                }}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleAddClient} 
                  loading={isSubmitting}
                  disabled={!newClient.name || !newClient.phone}
                >
                  {editingClient ? "Atualizar" : "Salvar"}
                </Button>
              </div>
            }
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-ios-text-secondary uppercase px-1">Nome Completo</label>
                <Input 
                  voice
                  placeholder="Ex: Mariana Costa"
                  value={newClient.name}
                  onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-bold text-ios-text-secondary uppercase">Telefone</label>
                  {phoneError && <span className="text-[9px] text-red-400 font-bold uppercase">Formato inválido</span>}
                </div>
                <input 
                  placeholder="(11) 99999-9999"
                  className={cn(
                    "bg-white/5 border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors",
                    phoneError ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-ios-gold/50"
                  )}
                  value={newClient.phone}
                  onChange={handlePhoneChange}
                  maxLength={15}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-ios-text-secondary uppercase px-1">Email (Opcional)</label>
                <input 
                  placeholder="mariana@email.com"
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-ios-gold/50"
                  value={newClient.email}
                  onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-ios-text-secondary uppercase px-1">Data de Nascimento</label>
                <input 
                  type="date"
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-ios-gold/50 appearance-none"
                  value={newClient.birthDate}
                  onChange={e => setNewClient({ ...newClient, birthDate: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-ios-text-secondary uppercase px-1">Tags (Separadas por vírgula)</label>
                <Input 
                  voice
                  placeholder="Ex: Noiva, Micro, Unhas"
                  value={newClient.tags}
                  onChange={e => setNewClient({ ...newClient, tags: e.target.value })}
                />
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {whatsappPrompt && (
          <Modal
            isOpen={!!whatsappPrompt}
            onClose={() => setWhatsappPrompt(null)}
            title="Automação WhatsApp"
          >
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-ios-gold/10 flex items-center justify-center text-ios-gold">
                   <MessageCircle size={32} />
                </div>
                <div>
                   <h3 className="text-[20px] font-bold text-white tracking-tight">Enviar {whatsappPrompt.title}?</h3>
                   <p className="text-[14px] text-ios-text-secondary mt-1">
                     Enviando para o número {whatsappPrompt.phone}
                   </p>
                </div>
              </div>

              <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
                 <p className="text-[14px] text-white/80 italic leading-relaxed whitespace-pre-wrap">
                   "{whatsappPrompt.message}"
                 </p>
              </div>

              <div className="flex flex-col gap-3">
                 <Button className="h-14 bg-[#25D366] hover:bg-[#25D366]/90 border-none text-white font-bold" onClick={() => {
                   openWhatsApp(whatsappPrompt.phone, whatsappPrompt.message);
                   setWhatsappPrompt(null);
                 }}>
                    <MessageCircle size={20} className="mr-2" />
                    Abrir no WhatsApp
                 </Button>
                 <div className="grid grid-cols-2 gap-3">
                    <Button variant="secondary" className="h-12 border-white/5 bg-white/5" onClick={() => {
                        navigator.clipboard.writeText(whatsappPrompt.message);
                        setToast({ message: "Mensagem copiada!", type: 'success' });
                    }}>
                       Copiar Texto
                    </Button>
                    <Button variant="secondary" className="h-12 border-none" onClick={() => setWhatsappPrompt(null)}>
                       Cancelar
                    </Button>
                 </div>
              </div>
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

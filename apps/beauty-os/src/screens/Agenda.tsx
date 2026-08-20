import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard, Avatar, StatusBadge, Modal, Button, Toast, Input, Textarea } from '../components/UI';
import { Logo } from '../components/Logo';
import { Plus, ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, User, MessageCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore, Appointment } from '../lib/store';
import { resolveMessage, openWhatsApp } from '../lib/whatsapp';

export default function Agenda() {
  const { appointments, clients, addAppointment, updateAppointment, updateAppointmentStatus, completeAppointment, isSlotAvailable, deleteAppointment, addTransaction, modalToOpen, modalData, setToast, setModalToOpen, automationTemplates } = useStore();
  const [selectedDate, setSelectedDate] = useState(new Date().getDate().toString());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    if (modalToOpen === 'appointment') {
      if (modalData) {
        setNewAppt(prev => ({ ...prev, ...modalData }));
      }
      setIsAddModalOpen(true);
      setModalToOpen(null);
    }
  }, [modalToOpen, modalData, setModalToOpen]);

  // New Appointment Form State
  const [newAppt, setNewAppt] = useState({
    clientId: '',
    service: '',
    time: '',
    date: new Date().toISOString().split('T')[0],
    duration: 60,
    price: 0,
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [whatsappPrompt, setWhatsappPrompt] = useState<{ phone: string, message: string, title?: string } | null>(null);

  const triggerAutomation = (type: string, appt: any) => {
    const template = automationTemplates.find(t => t.type === type && t.isActive);
    if (!template) return;

    const client = clients.find(c => c.id === appt.clientId);
    const phone = client?.phone || appt.clientPhone;
    if (!phone) return;

    const [year, month, day] = appt.date.split('-');
    const formattedDate = `${day}/${month}/${year}`;

    const message = resolveMessage(template.message, {
      nome: client?.name || appt.clientName,
      servico: appt.service,
      data: formattedDate,
      hora: appt.time,
      empresa: 'LESHANOT STUDIO'
    });

    setWhatsappPrompt({ phone, message, title: template.title });
  };

  const handleAddAppointment = async () => {
    if (!newAppt.clientId || !newAppt.service || !newAppt.time || !newAppt.date) {
      setToast({ message: "Por favor, preencha todos os campos obrigatórios.", type: 'error' });
      return;
    }

    const now = new Date();
    const appointmentDateTime = new Date(`${newAppt.date}T${newAppt.time}:00`);
    
    // 1. Duration validation
    if (newAppt.duration <= 0) {
      setToast({ message: "A duração deve ser de pelo menos 1 minuto.", type: 'error' });
      return;
    }

    // 2. Past date validation (only for new appointments)
    if (!editingAppointment && appointmentDateTime < now) {
      setToast({ message: "Não é possível agendar para uma data ou hora no passado.", type: 'error' });
      return;
    }

    // 3. Duplicate check (same client, date, service)
    const isDuplicate = appointments.some(a => 
      a.clientId === newAppt.clientId && 
      a.date === newAppt.date && 
      a.service.toLowerCase() === newAppt.service.toLowerCase() &&
      a.id !== editingAppointment?.id &&
      a.status !== 'Cancelado'
    );

    if (isDuplicate) {
      if (!confirm("Já existe um agendamento para esta cliente e serviço no mesmo dia. Deseja continuar?")) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (editingAppointment) {
        // Conflict check for update (handled also in store now, but good to have here for UI control)
        if (!isSlotAvailable(newAppt.date, newAppt.time, newAppt.duration, editingAppointment.id)) {
          setToast({ message: "Conflito de horário! Verifique se já existe algo neste período.", type: 'error' });
          setIsSubmitting(false);
          return;
        }
        await updateAppointment(editingAppointment.id, { ...newAppt, price: Number(newAppt.price) });
        setToast({ message: "Agendamento atualizado", type: 'success' });
      } else {
        // Conflict check for new
        if (!isSlotAvailable(newAppt.date, newAppt.time, newAppt.duration)) {
          setToast({ message: "Conflito de horário! Este slot já está ocupado por outro agendamento.", type: 'error' });
          setIsSubmitting(false);
          return;
        }

        await addAppointment({
          ...newAppt,
          price: Number(newAppt.price),
          status: 'Confirmado'
        });
        triggerAutomation('confirmation', { ...newAppt, price: Number(newAppt.price) });
      }
      setIsAddModalOpen(false);
      setEditingAppointment(null);
      setNewAppt({
        clientId: '',
        service: '',
        time: '',
        date: new Date().toISOString().split('T')[0],
        duration: 60,
        price: 0,
        notes: ''
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Horário ocupado") {
        return;
      }
      console.error(error);
      setToast({ message: "Erro ao salvar agendamento", type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + i + 1); // Start from Monday
    return {
      day: ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'][d.getDay()],
      date: d.getDate().toString(),
      fullDate: d.toISOString().split('T')[0]
    };
  });

  const displayAppointments = appointments.filter(appt => {
    const day = days.find(d => d.date === selectedDate);
    return appt.date === day?.fullDate;
  });

  const getClientName = (appt: Appointment) => {
    if (appt.clientId === 'public-booking') {
      return appt.clientName || 'Cliente Externo';
    }
    const client = clients.find(c => c.id === appt.clientId);
    return client?.name || 'Cliente deletado';
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-2 mt-4">
          <Logo size="sm" />
          <h1 className="text-[18px] font-bold tracking-tightest uppercase text-ios-text-secondary opacity-40">Agenda</h1>
        </div>

        {/* Date Selector */}
        <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar shrink-0">
          {days.map((d, i) => (
            <div 
              key={i} 
              onClick={() => setSelectedDate(d.date)}
              className={cn(
                "flex flex-col items-center gap-1 min-w-[44px] p-2.5 rounded-xl transition-all duration-300 cursor-pointer",
                selectedDate === d.date ? "bg-ios-gold text-ios-bg shadow-lg shadow-ios-gold/20" : "bg-white/5 border border-white/10"
              )}
            >
              <span className={cn("text-[9px] font-bold uppercase tracking-wider", selectedDate === d.date ? "text-ios-bg" : "opacity-60")}>
                {d.day}
              </span>
              <span className="text-sm font-extrabold">{d.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-6 pb-12 hide-scrollbar">
        <div className="flex flex-col gap-6 relative">
          {/* Vertical Line */}
          <div className="absolute left-[38px] top-6 bottom-6 w-[1px] bg-white/5 opacity-50" />

          {displayAppointments.length > 0 ? (
            displayAppointments.map((appt) => {
              const client = clients.find(c => c.id === appt.clientId);
              return (
                <div key={appt.id} className="flex gap-4 group cursor-pointer" onClick={() => setSelectedAppointment(appt)}>
                  <div className="flex flex-col items-end pt-2 min-w-[40px]">
                    <span className="text-[10px] font-bold text-ios-text-secondary whitespace-nowrap opacity-60">{appt.time}</span>
                  </div>

                  <GlassCard className={cn(
                    "flex-1 p-[14px] flex items-center gap-3 active:scale-[0.98] transition-transform",
                    appt.status === 'Concluído' ? "opacity-60" : "",
                    appt.status === 'Pendente' ? "border-ios-gold/30" : ""
                  )}>
                    <Avatar fallback={getClientName(appt).charAt(0)} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className="text-[14px] font-bold truncate leading-tight text-white">{getClientName(appt)}</h4>
                        <StatusBadge 
                          label={appt.status} 
                          variant={appt.status === 'Confirmado' ? 'gold' : appt.status === 'Concluído' ? 'cyan' : appt.status === 'Pendente' ? 'vip' : 'default'} 
                        />
                      </div>
                      <p className="text-[10px] text-ios-text-secondary font-bold uppercase tracking-wider opacity-60 leading-tight">
                        {appt.service} {appt.clientId === 'public-booking' && '• ONLINE'}
                      </p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerAutomation('custom', appt);
                      }}
                      className="p-2.5 rounded-full bg-ios-cyan/10 text-ios-cyan hover:bg-ios-cyan/20 transition-all active:scale-95"
                    >
                      <MessageCircle size={16} />
                    </button>
                  </GlassCard>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-20 opacity-20">
              <CalendarIcon size={40} className="mb-4 text-ios-text-secondary" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-ios-text-secondary">Nenhum agendamento para hoje</p>
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <button 
        onClick={() => setIsAddModalOpen(true)}
        className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-ios-gold flex items-center justify-center text-ios-bg shadow-[0_10px_20px_rgba(230,192,139,0.3)] active:scale-95 transition-transform z-30"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {/* Appointment Detail Modal */}
      <AnimatePresence>
        {selectedAppointment && (
          <Modal 
            isOpen={!!selectedAppointment} 
            onClose={() => setSelectedAppointment(null)} 
            title="Detalhes do Agendamento"
            footer={
              <div className="flex flex-col gap-3">
                {selectedAppointment.status === 'Pendente' && (
                  <Button 
                    className="w-full h-14"
                    onClick={async () => {
                      try {
                        await updateAppointmentStatus(selectedAppointment.id, 'Confirmado');
                        setSelectedAppointment(null);
                        setToast({ message: "Agendamento confirmado!", type: 'success' });
                      } catch (err) {
                        setToast({ message: "Erro ao confirmar", type: 'error' });
                      }
                    }}
                  >
                    Confirmar Agendamento
                  </Button>
                )}
                {selectedAppointment.status === 'Confirmado' && (
                  <Button 
                    className="w-full h-14"
                    onClick={async () => {
                      try {
                        await completeAppointment(selectedAppointment.id);
                        setSelectedAppointment(null);
                        triggerAutomation('post_attendance', selectedAppointment);
                      } catch (err) {
                        setToast({ message: "Erro ao concluir", type: 'error' });
                      }
                    }}
                  >
                    Concluir Atendimento
                  </Button>
                )}
                <div className="flex gap-3">
                  <Button 
                    variant="secondary" 
                    className="flex-1 h-14"
                    onClick={() => {
                      setNewAppt({
                        clientId: selectedAppointment.clientId,
                        service: selectedAppointment.service,
                        time: selectedAppointment.time,
                        date: selectedAppointment.date,
                        duration: selectedAppointment.duration,
                        price: selectedAppointment.price || 0,
                        notes: selectedAppointment.notes || ''
                      });
                      setEditingAppointment(selectedAppointment);
                      setSelectedAppointment(null);
                      setIsAddModalOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="flex-1 h-14 text-red-100 hover:text-red-400 border border-red-900/20"
                    onClick={async () => {
                      if (confirm('Cancelar este agendamento?')) {
                        try {
                          await deleteAppointment(selectedAppointment.id);
                          setSelectedAppointment(null);
                          setToast({ message: "Agendamento cancelado", type: 'success' });
                        } catch (err) {
                          setToast({ message: "Erro ao cancelar agendamento", type: 'error' });
                        }
                      }
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            }
          >
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                 <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl">
                    <Avatar fallback={getClientName(selectedAppointment).charAt(0)} size="lg" />
                    <div className="flex-1">
                      <h3 className="text-[18px] font-bold text-white">{getClientName(selectedAppointment)}</h3>
                      <p className="text-sm text-ios-gold font-medium">{selectedAppointment.service}</p>
                      {selectedAppointment.clientPhone && (
                        <p className="text-[12px] text-ios-text-secondary mt-1">{selectedAppointment.clientPhone}</p>
                      )}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                      <Clock size={16} className="text-ios-gold" />
                      <span className="text-sm font-semibold">{selectedAppointment.time}</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                      <User size={16} className="text-ios-gold" />
                      <span className="text-sm font-semibold">{selectedAppointment.duration} min</span>
                    </div>
                 </div>
              </div>
            </div>
          </Modal>
        )}

        {isAddModalOpen && (
          <Modal 
            isOpen={isAddModalOpen} 
            onClose={() => {
              setIsAddModalOpen(false);
              setEditingAppointment(null);
            }} 
            title={editingAppointment ? "Editar Agendamento" : "Novo Agendamento"}
            footer={
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingAppointment(null);
                }}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleAddAppointment} 
                  loading={isSubmitting}
                  disabled={!newAppt.clientId || !newAppt.service || !newAppt.time}
                >
                  {editingAppointment ? "Atualizar" : "Salvar"}
                </Button>
              </div>
            }
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-ios-text-secondary uppercase px-1">Cliente</label>
                <select 
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-ios-gold/50 appearance-none w-full"
                  value={newAppt.clientId}
                  onChange={e => setNewAppt({ ...newAppt, clientId: e.target.value })}
                >
                  <option value="" className="bg-[#121214]">Selecione uma cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id} className="bg-[#121214]">{c.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-ios-text-secondary uppercase px-1">Serviço</label>
                  <Input 
                    voice
                    placeholder="Ex: Microblading" 
                    value={newAppt.service}
                    onChange={e => setNewAppt({ ...newAppt, service: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-ios-text-secondary uppercase px-1">Duração (min)</label>
                  <input 
                    type="number"
                    placeholder="60" 
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none" 
                    value={newAppt.duration || ''}
                    onChange={e => setNewAppt({ ...newAppt, duration: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-ios-text-secondary uppercase px-1">Valor (R$)</label>
                  <input 
                    type="number"
                    placeholder="0,00" 
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none" 
                    value={newAppt.price || ''}
                    onChange={e => setNewAppt({ ...newAppt, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                   <label className="text-[11px] font-bold text-ios-text-secondary uppercase px-1">Horário</label>
                   <input 
                     type="time" 
                     className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none" 
                     value={newAppt.time}
                     onChange={e => setNewAppt({ ...newAppt, time: e.target.value })}
                   />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                 <label className="text-[11px] font-bold text-ios-text-secondary uppercase px-1">Data</label>
                 <input 
                   type="date" 
                   className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none" 
                   value={newAppt.date}
                   min={new Date().toISOString().split('T')[0]}
                   onChange={e => setNewAppt({ ...newAppt, date: e.target.value })}
                 />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-ios-text-secondary uppercase px-1">Observações</label>
                <Textarea 
                  voice
                  placeholder="Detalhes opcionais..." 
                  value={newAppt.notes}
                  onChange={e => setNewAppt({ ...newAppt, notes: e.target.value })}
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
                 <Button className="h-14 bg-[#25D366] hover:bg-[#25D366]/90 border-none text-white" onClick={() => {
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
    </div>
  );
}

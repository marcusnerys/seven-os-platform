import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard, Avatar, StatusBadge, Modal, Button, Toast, Input, Textarea } from '../components/UI';
import { Logo } from '../components/Logo';
import { Plus, ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, User, MessageCircle, Trash2, X, CalendarPlus, Download } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore, Appointment } from '../lib/store';
import { resolveMessage, openWhatsApp } from '../lib/whatsapp';

export default function Agenda() {
  const { appointments, clients, addAppointment, updateAppointment, updateAppointmentStatus, completeAppointment, isSlotAvailable, deleteAppointment, addTransaction, modalToOpen, modalData, setToast, setModalToOpen, automationTemplates } = useStore();
  const themeBg = useStore(state => state.themeBg);
  const isLight = themeBg === 'light';
  const textPrimary = isLight ? '#1C1C1E' : '#F5F5F7';
  const textSecondary = isLight ? '#6B6B70' : '#8E8E93';
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedFullDate, setSelectedFullDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isFabOpen, setIsFabOpen] = useState(false);

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
    date: selectedFullDate,
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
        date: selectedFullDate,
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

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const weekDays = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const calendarCells = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const toFullDate = (day: number) => {
    const m = String(currentMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${currentYear}-${m}-${d}`;
  };

  const hasAppointments = (day: number) =>
    appointments.some(a => a.date === toFullDate(day) && a.status !== 'Cancelado');

  const displayAppointments = appointments.filter(appt => appt.date === selectedFullDate);

  const getClientName = (appt: Appointment) => {
    if (appt.clientId === 'public-booking') {
      return appt.clientName || 'Cliente Externo';
    }
    const client = clients.find(c => c.id === appt.clientId);
    return client?.name || 'Cliente deletado';
  };

  const exportICS = (appt: Appointment) => {
    const [y, m, d] = appt.date.split('-');
    const [h, min] = appt.time.split(':');
    const padded = (n: string) => n.padStart(2, '0');
    const dtStart = `${y}${padded(m)}${padded(d)}T${padded(h)}${padded(min)}00`;
    const endMin = Number(h) * 60 + Number(min) + (appt.duration || 60);
    const endH = String(Math.floor(endMin / 60) % 24).padStart(2, '0');
    const endM = String(endMin % 60).padStart(2, '0');
    const dtEnd = `${y}${padded(m)}${padded(d)}T${endH}${endM}00`;
    const clientName = getClientName(appt);
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Leshanot Studio//Beauty OS//PT',
      'BEGIN:VEVENT',
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${appt.service} - ${clientName}`,
      `DESCRIPTION:Serviço: ${appt.service}\\nCliente: ${clientName}\\nValor: R$ ${appt.price?.toFixed(2) || '0,00'}${appt.notes ? '\\nObs: ' + appt.notes : ''}`,
      'LOCATION:Leshanot Studio',
      `STATUS:${appt.status === 'Cancelado' ? 'CANCELLED' : 'CONFIRMED'}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agendamento-${appt.date}-${appt.service.replace(/\s/g, '-')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-4 mt-2">
          <Logo size="sm" />
          <h1 className="text-[16px] font-bold tracking-tightest uppercase text-ios-text-secondary opacity-40">Agenda</h1>
        </div>

        {/* Month Navigator */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
              else setCurrentMonth(m => m - 1);
            }}
            className="w-8 h-8 rounded-full bg-ios-surface flex items-center justify-center text-ios-text-secondary active:scale-90 transition-transform"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="text-center">
            <span className="text-[22px] font-black tracking-tight" style={{ color: textPrimary }}>
              {monthNames[currentMonth]}
            </span>
            <span className="text-[13px] font-bold ml-2" style={{ color: textSecondary }}>{currentYear}</span>
          </div>
          <button
            onClick={() => {
              if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
              else setCurrentMonth(m => m + 1);
            }}
            className="w-8 h-8 rounded-full bg-ios-surface flex items-center justify-center text-ios-text-secondary active:scale-90 transition-transform"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Week day headers */}
        <div className="grid grid-cols-7 mb-2 rounded-xl px-1 py-2" style={{ border: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'}` }}>
          {weekDays.map(d => (
            <div key={d} className="text-center text-[11px] font-bold uppercase tracking-wide" style={{ color: textSecondary }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-y-1 mb-3">
          {calendarCells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;
            const fullDate = toFullDate(day);
            const isToday = fullDate === todayStr;
            const isSelected = fullDate === selectedFullDate;
            const hasDot = hasAppointments(day);
            return (
              <div
                key={fullDate}
                onClick={() => setSelectedFullDate(fullDate)}
                className="flex flex-col items-center justify-center gap-0.5 py-1 cursor-pointer"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold transition-all"
                  style={{
                    backgroundColor: isSelected ? 'var(--color-ios-gold)' : isToday ? (isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.10)') : 'transparent',
                    color: isSelected ? (isLight ? '#F2F2F7' : '#0B0B0D') : isToday ? 'var(--color-ios-gold)' : textPrimary,
                    boxShadow: isSelected ? '0 2px 8px rgba(var(--color-ios-gold-rgb, 212,175,55), 0.3)' : undefined,
                    outline: isToday && !isSelected ? `1px solid var(--color-ios-gold)` : undefined,
                  }}
                >
                  {day}
                </div>
                {hasDot && (
                  <div
                    className="w-1 h-1 rounded-full"
                    style={{ backgroundColor: isSelected ? (isLight ? '#F2F2F7' : '#0B0B0D') : 'var(--color-ios-gold)' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-5 pb-12 hide-scrollbar">
        {/* Selected day label */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: textSecondary }}>
            {selectedFullDate === todayStr ? 'Hoje' : (() => {
              const [y, m, d] = selectedFullDate.split('-');
              return `${d}/${m}/${y}`;
            })()}
          </span>
          {displayAppointments.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-ios-gold/15 text-ios-gold text-[10px] font-bold">
              {displayAppointments.length} agendamento{displayAppointments.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-4 relative">
          {/* Vertical Line */}
          <div className="absolute left-[38px] top-4 bottom-4 w-[1px] bg-white/5 opacity-50" />

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

      {/* FAB overlay */}
      {isFabOpen && (
        <div className="absolute inset-0 z-20" onClick={() => setIsFabOpen(false)} />
      )}

      {/* FAB SpeedDial */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end gap-3 z-30">
        <AnimatePresence>
          {isFabOpen && (
            <>
              {[
                {
                  label: 'Adicionar',
                  icon: CalendarPlus,
                  color: 'bg-ios-gold',
                  action: () => { setNewAppt(prev => ({ ...prev, date: selectedFullDate })); setIsAddModalOpen(true); setIsFabOpen(false); },
                  always: true,
                },
                {
                  label: 'Enviar mensagem',
                  icon: MessageCircle,
                  color: 'bg-[#25D366]',
                  action: () => {
                    const upcoming = displayAppointments.find(a => a.status !== 'Cancelado');
                    if (upcoming) {
                      const client = clients.find(c => c.id === upcoming.clientId);
                      const phone = client?.phone || upcoming.clientPhone;
                      if (phone) {
                        openWhatsApp(phone, `Olá ${upcoming.clientName}! Confirmando seu horário: ${upcoming.service} às ${upcoming.time}.`);
                      } else {
                        setToast({ message: 'Cliente sem telefone cadastrado', type: 'error' });
                      }
                    } else {
                      setToast({ message: 'Nenhum agendamento nesta data', type: 'error' });
                    }
                    setIsFabOpen(false);
                  },
                  always: true,
                },
                ...(displayAppointments.length > 0 ? [{
                  label: 'Apagar',
                  icon: Trash2,
                  color: 'bg-red-500/90',
                  action: () => {
                    if (displayAppointments.length === 1) {
                      if (confirm(`Apagar agendamento de ${displayAppointments[0].clientName}?`)) {
                        deleteAppointment(displayAppointments[0].id);
                        setToast({ message: 'Agendamento apagado', type: 'success' });
                      }
                    } else {
                      setToast({ message: 'Toque no agendamento e selecione Cancelar para apagar', type: 'success' });
                    }
                    setIsFabOpen(false);
                  },
                  always: false,
                }] : []),
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: 20, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.8 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <span className="text-[12px] font-bold text-white bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm whitespace-nowrap">
                    {item.label}
                  </span>
                  <button
                    onClick={item.action}
                    className={`w-11 h-11 rounded-full ${item.color} flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform`}
                  >
                    <item.icon size={20} strokeWidth={2} />
                  </button>
                </motion.div>
              ))}
            </>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsFabOpen(v => !v)}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all duration-200 ${isFabOpen ? 'bg-white/15 border border-white/20 text-white' : 'bg-ios-gold text-ios-bg shadow-[0_10px_20px_rgba(230,192,139,0.3)]'}`}
        >
          <AnimatePresence mode="wait">
            {isFabOpen ? (
              <motion.div key="close" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <X size={24} strokeWidth={2.5} />
              </motion.div>
            ) : (
              <motion.div key="open" initial={{ opacity: 0, rotate: 90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <Plus size={24} strokeWidth={2.5} />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

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
                    className="h-14 px-4 border-ios-gold/20"
                    onClick={() => exportICS(selectedAppointment)}
                    title="Exportar para Calendário"
                  >
                    <Download size={18} />
                  </Button>
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

import { useState, useEffect, ChangeEvent, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Clock, 
  ChevronRight, 
  CheckCircle2, 
  ChevronLeft,
  User,
  Phone,
  MessageSquare,
  MessageCircle,
  Search,
  Scissors,
  Eye,
  Wind,
  Sun,
  Sparkles,
  Heart,
  Palette,
  Zap,
  Star
} from 'lucide-react';
import { GlassCard, Button, Toast } from '../components/UI';
import { Logo } from '../components/Logo';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

const CATEGORIES = [
  { id: 'all', name: 'Todos', icon: Sparkles },
  { id: 'unhas', name: 'Unhas', icon: Scissors },
  { id: 'cilios', name: 'Cílios', icon: Eye },
  { id: 'cabelo', name: 'Cabelo', icon: Wind },
  { id: 'depilacao', name: 'Depilação', icon: Zap },
  { id: 'sobrancelha', name: 'Sobrancelha', icon: Palette },
  { id: 'bronzeamento', name: 'Bronzeamento', icon: Sun },
  { id: 'estetica', name: 'Estética', icon: Heart },
  { id: 'maquiagem', name: 'Maquiagem', icon: Star },
];

const DEFAULT_SERVICES = [
  // UNHAS
  { id: 'm1', name: 'Manicure', duration: 40, price: 50, category: 'unhas' },
  { id: 'p1', name: 'Pedicure', duration: 50, price: 60, category: 'unhas' },
  { id: 'a1', name: 'Alongamento em gel', duration: 120, price: 180, category: 'unhas' },
  { id: 'b1', name: 'Blindagem', duration: 60, price: 100, category: 'unhas' },
  { id: 'n1', name: 'Nail art', duration: 30, price: 40, category: 'unhas' },
  // CÍLIOS
  { id: 'ec1', name: 'Extensão clássica', duration: 90, price: 150, category: 'cilios' },
  { id: 'vb1', name: 'Volume brasileiro', duration: 120, price: 180, category: 'cilios' },
  { id: 'vr1', name: 'Volume russo', duration: 150, price: 220, category: 'cilios' },
  { id: 'll1', name: 'Lash lifting', duration: 60, price: 120, category: 'cilios' },
  // CABELO
  { id: 'cf1', name: 'Corte feminino', duration: 60, price: 120, category: 'cabelo' },
  { id: 'e1', name: 'Escova', duration: 45, price: 80, category: 'cabelo' },
  { id: 'co1', name: 'Coloração', duration: 120, price: 200, category: 'cabelo' },
  { id: 'h1', name: 'Hidratação', duration: 45, price: 100, category: 'cabelo' },
  { id: 'pr1', name: 'Progressiva', duration: 180, price: 350, category: 'cabelo' },
  { id: 'bc1', name: 'Botox capilar', duration: 120, price: 250, category: 'cabelo' },
  // DEPILAÇÃO
  { id: 'ax1', name: 'Axila', duration: 15, price: 35, category: 'depilacao' },
  { id: 'pe1', name: 'Pernas', duration: 30, price: 70, category: 'depilacao' },
  { id: 'bu1', name: 'Buço', duration: 10, price: 25, category: 'depilacao' },
  { id: 'vi1', name: 'Virilha', duration: 30, price: 80, category: 'depilacao' },
  // SOBRANCELHA
  { id: 'ds1', name: 'Design', duration: 30, price: 50, category: 'sobrancelha' },
  { id: 'hn1', name: 'Henna', duration: 20, price: 30, category: 'sobrancelha' },
  { id: 'bl1', name: 'Brow lamination', duration: 60, price: 140, category: 'sobrancelha' },
  // BRONZEAMENTO
  { id: 'bn1', name: 'Bronze natural', duration: 180, price: 100, category: 'bronzeamento' },
  { id: 'bj1', name: 'Bronze a jato', duration: 30, price: 150, category: 'bronzeamento' },
  // ESTÉTICA
  { id: 'lp1', name: 'Limpeza de pele', duration: 90, price: 180, category: 'estetica' },
  { id: 'mr1', name: 'Massagem relaxante', duration: 60, price: 150, category: 'estetica' },
  { id: 'dl1', name: 'Drenagem linfática', duration: 60, price: 160, category: 'estetica' },
  // MAQUIAGEM
  { id: 'ms1', name: 'Social', duration: 90, price: 200, category: 'maquiagem' },
  { id: 'mn1', name: 'Noiva', duration: 180, price: 800, category: 'maquiagem' },
  { id: 'pc1', name: 'Produção completa', duration: 150, price: 450, category: 'maquiagem' },
];

const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'
];

const PROFESSIONALS = [
  { id: 'p1', name: 'Alana Vieira', role: 'Especialista em Cílios', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
  { id: 'p2', name: 'Jéssica Lima', role: 'Design de Sobrancelhas', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100' },
  { id: 'p3', name: 'Mariana Duarte', role: 'Nail Designer', image: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=100' },
];

export default function BookingPage() {
  const { userId } = useParams();
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<any>(PROFESSIONALS[0]);
  const [services, setServices] = useState<any[]>(DEFAULT_SERVICES);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [clientInfo, setClientInfo] = useState({ name: '', phone: '', notes: '' });
  const [phoneError, setPhoneError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
  const [professionalName, setProfessionalName] = useState('Leshanot Studio');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const getNextDays = (count: number) => {
    const days = [];
    for (let i = 0; i < count; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const availableDays = getNextDays(14);

  useEffect(() => {
    if (userId) {
      // Try to fetch studio name (público, via RPC escopada a este empresa_id)
      supabase.rpc('beautyos_public_settings', { p_empresa_id: userId }).then(({ data }) => {
        const settings = data?.[0];
        if (settings?.studio_name) setProfessionalName(settings.studio_name);
      });

      // Fetch services from DB (público, via RPC escopada a este empresa_id)
      supabase.rpc('beautyos_public_services', { p_empresa_id: userId }).then(({ data }) => {
        if (data && data.length > 0) {
          const servicesList = data.map((row: any) => ({ id: row.id, name: row.name, price: Number(row.price) || 0, duration: row.duration }));
          setServices(prev => [...prev, ...servicesList]);
        }
      });
    }
  }, [userId]);

  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'all' || service.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [services, searchQuery, activeCategory]);

  useEffect(() => {
    if (selectedDate && userId) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      // Fetch occupied slots for selected date (via view pública, sem dados do cliente)
      supabase
        .from('beautyos_public_slots')
        .select('time')
        .eq('empresa_id', userId)
        .eq('date', dateStr)
        .then(({ data }) => {
          setOccupiedSlots((data ?? []).map(row => row.time));
        });
    }
  }, [selectedDate, userId]);

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
    setClientInfo({ ...clientInfo, phone: formatted });
    if (formatted.length > 0) {
      setPhoneError(!isPhoneValid(formatted));
    } else {
      setPhoneError(false);
    }
  };

  const handleBooking = async () => {
    if (!userId || !selectedService || !selectedDate || !selectedTime) {
      setToast({ message: 'Por favor, preencha todos os campos.', type: 'error' });
      return;
    }
    
    if (!isPhoneValid(clientInfo.phone)) {
      setPhoneError(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const appointmentData = {
        empresa_id: userId,
        client_id: null,
        client_name: clientInfo.name,
        client_phone: clientInfo.phone,
        service: selectedService.name,
        date: dateStr,
        time: selectedTime,
        price: selectedService.price,
        duration: selectedService.duration,
        status: 'Pendente',
        notes: clientInfo.notes,
      };

      // Save appointment (policy pública: só permite client_id null + status Pendente)
      const { error: apptError } = await supabase.from('beautyos_appointments').insert(appointmentData);
      if (apptError) throw apptError;

      // Save notification for the studio (policy pública: só type 'booking' + read false)
      const { error: notifError } = await supabase.from('beautyos_notifications').insert({
        empresa_id: userId,
        title: 'Nova reserva recebida',
        message: `${selectedService.name} • ${selectedTime}\nCliente: ${clientInfo.name}`,
        type: 'booking',
        read: false,
      });
      if (notifError) throw notifError;

      setIsSuccess(true);
    } catch (error) {
      console.error('Error booking:', error);
      setToast({ message: 'Erro ao realizar agendamento. Tente novamente.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    const whatsappMessage = `Olá! Realizei um agendamento no Leshanot Studio:\n\n✨ Reserva Confirmada ✨\n\nServiço: ${selectedService?.name}\nProfissional: ${selectedProfessional?.name}\nData: ${selectedDate?.toLocaleDateString('pt-BR')}\nHorário: ${selectedTime}\n\nPor favor, confirme meu horário!`;
    const whatsappUrl = `https://wa.me/55${clientInfo.phone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`;

    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] p-8 text-center bg-[#0B0B0D] safe-bottom">
        <motion.div
           initial={{ scale: 0.5, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className="w-24 h-24 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] mb-8"
        >
          <CheckCircle2 size={56} />
        </motion.div>
        <h1 className="text-3xl font-bold mb-3 text-[#F5F5F7] tracking-tight">Agendamento Realizado!</h1>
        <p className="text-[#8E8E93] mb-10 max-w-xs text-[15px] leading-relaxed">
          Sua solicitação para <strong className="text-[#F5F5F7]">{selectedService?.name}</strong> foi enviada. Agora, confirme seu horário enviando uma mensagem.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button 
            onClick={() => window.open(whatsappUrl, '_blank')} 
            className="w-full h-14 rounded-2xl bg-[#25D366] border-none text-white shadow-xl shadow-[#25D366]/20 font-bold"
          >
            <MessageCircle size={20} />
            Confirmar via WhatsApp
          </Button>
          <Button 
            variant="secondary"
            onClick={() => window.location.reload()} 
            className="w-full h-14 rounded-2xl border-white/5 text-[#8E8E93]"
          >
            Novo Agendamento
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto w-full h-[100dvh] flex flex-col bg-[#0B0B0D] selection:bg-[#D4AF37]/30 overflow-hidden">
      {/* Header */}
      <header className="p-6 border-b border-white/5 flex items-center justify-between bg-[#0B0B0D]/80 backdrop-blur-xl z-30 shrink-0">
        <div className="flex items-center gap-3">
          {step > 1 && (
            <button 
              onClick={() => {
                if (step === 3 && !selectedTime) setStep(2);
                else setStep(parseFloat((step - 1).toFixed(1)) || 1); // Handle the 0.5 step
              }} 
              className="p-2 -ml-2 text-[#D4AF37] active:scale-75 transition-transform"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          <div>
            <Logo size="sm" className="mb-0.5" />
            <p className="text-[10px] text-[#8E8E93] uppercase tracking-[1px] font-bold truncate max-w-[150px]">Reserva • {professionalName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 h-6">
          {[1, 1.5, 2, 3, 4].map(s => (
            <div 
              key={s} 
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all duration-300",
                step >= s ? "bg-[#D4AF37] scale-125 shadow-[0_0_8px_rgba(212,175,55,0.5)]" : "bg-white/10"
              )} 
            />
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pt-8 pb-40 relative scroll-smooth">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-8"
            >
              <div>
                <h1 className="text-[32px] font-bold text-[#F5F5F7] tracking-tight leading-tight">Escolha seu serviço</h1>
                <p className="text-[#8E8E93] text-[15px] mt-1">Selecione o atendimento desejado</p>
              </div>

              {/* Search Bar */}
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E8E93] group-focus-within:text-[#D4AF37] transition-colors" size={20} />
                <input 
                  type="text"
                  placeholder="Buscar serviço"
                  className="w-full bg-[#1C1C1E] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-[#F5F5F7] placeholder-[#8E8E93] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/30 transition-all text-[16px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Categories */}
              <div className="flex flex-col gap-4 -mx-6">
                <div className="flex items-center gap-3 overflow-x-auto px-6 no-scrollbar pb-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={cn(
                          "flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap transition-all duration-300 border text-[14px] font-medium",
                          isActive 
                            ? "bg-[#D4AF37] border-[#D4AF37] text-[#0B0B0D]" 
                            : "bg-[#1C1C1E] border-white/5 text-[#8E8E93] hover:bg-[#2C2C2E]"
                        )}
                      >
                        <Icon size={16} className={isActive ? "text-[#0B0B0D]" : "text-[#D4AF37]"} />
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Services Grid */}
              <div className="grid grid-cols-1 gap-4">
                {filteredServices.map((service) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={service.id}
                  >
                    <GlassCard 
                      className="p-5 flex flex-col gap-4 border border-white/5 bg-[#151518] hover:bg-[#1C1C1E] transition-all cursor-default rounded-[22px] group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-bold text-[#D4AF37] uppercase tracking-widest">{service.category}</span>
                          </div>
                          <h3 className="text-xl font-bold text-[#F5F5F7] tracking-tight">{service.name}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform">
                          {(() => {
                            const cat = CATEGORIES.find(c => c.id === service.category);
                            const Icon = cat?.icon || Sparkles;
                            return <Icon size={24} />;
                          })()}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-4 text-[14px] text-[#8E8E93]">
                          <span className="flex items-center gap-1.5"><Clock size={16} /> {service.duration} min</span>
                          <span className="text-[#F5F5F7] font-bold">A partir de R$ {service.price}</span>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => {
                            setSelectedService(service);
                            setStep(1.5);
                          }}
                          className="px-6 h-10 text-[13px] font-bold rounded-xl"
                        >
                          Selecionar
                        </Button>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}

                {filteredServices.length === 0 && (
                  <div className="text-center py-20 opacity-30">
                    <p className="text-[16px]">Nenhum serviço encontrado.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {step === 1.5 && (
            <motion.div
              key="step1.5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-8"
            >
              <div>
                <h1 className="text-3xl font-bold text-[#F5F5F7] tracking-tight">Escolha o profissional</h1>
                <p className="text-[#8E8E93] text-[15px] mt-1">Quem cuidará de você hoje?</p>
              </div>

              <div className="flex flex-col gap-4">
                {PROFESSIONALS.map((pro) => (
                  <GlassCard
                    key={pro.id}
                    onClick={() => {
                      setSelectedProfessional(pro);
                      setStep(2);
                    }}
                    className={cn(
                      "p-5 flex items-center gap-4 cursor-pointer border border-white/5 bg-[#151518] hover:bg-[#1C1C1E] transition-all rounded-[22px]",
                      selectedProfessional?.id === pro.id ? "ring-1 ring-[#D4AF37]" : ""
                    )}
                  >
                    <img src={pro.image} alt={pro.name} className="w-16 h-16 rounded-full object-cover border-2 border-white/5" />
                    <div className="flex-1">
                      <h3 className="text-[17px] font-bold text-[#F5F5F7] tracking-tight">{pro.name}</h3>
                      <p className="text-[13px] text-[#8E8E93]">{pro.role}</p>
                    </div>
                    <ChevronRight size={20} className="text-[#D4AF37]/50" />
                  </GlassCard>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-6"
            >
              <div>
                <h1 className="text-3xl font-bold text-[#F5F5F7] tracking-tight">Escolha o dia</h1>
                <p className="text-[#8E8E93] text-[15px] mt-1">Selecione a data disponível</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {availableDays.map((date) => {
                  const isSelected = selectedDate?.toDateString() === date.toDateString();
                  const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
                  const dayNum = date.getDate();
                  const monthName = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => setSelectedDate(date)}
                      className={cn(
                        "p-5 rounded-3xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95",
                        isSelected 
                          ? "bg-[#D4AF37] border-[#D4AF37] text-[#0B0B0D] shadow-[0_10px_20px_rgba(212,175,55,0.2)]" 
                          : "bg-[#1C1C1E] border-white/5 text-[#F5F5F7] hover:bg-[#2C2C2E]"
                      )}
                    >
                      <span className={cn("text-[11px] font-bold uppercase tracking-widest", isSelected ? "text-[#0B0B0D]/60" : "text-[#8E8E93]")}>
                        {dayName}
                      </span>
                      <span className="text-2xl font-bold tracking-tighter">{dayNum}</span>
                      <span className={cn("text-[11px] font-bold uppercase", isSelected ? "text-[#0B0B0D]/60" : "text-[#D4AF37]")}>{monthName}</span>
                    </button>
                  );
                })}
              </div>

              {selectedDate && (
                <div className="fixed bottom-0 left-0 right-0 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-[#0B0B0D]/90 backdrop-blur-xl border-t border-white/5 z-40">
                  <div className="max-w-xl mx-auto">
                    <Button onClick={() => setStep(3)} className="w-full h-14 rounded-2xl shadow-xl shadow-[#D4AF37]/20 text-[16px] font-bold">
                      Escolher Horário
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-6"
            >
              <div>
                <h1 className="text-3xl font-bold text-[#F5F5F7] tracking-tight">Qual horário?</h1>
                <p className="text-[#8E8E93] text-[15px] mt-1">Selecione o melhor momento</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {TIME_SLOTS.map((slot) => {
                  const isOccupied = occupiedSlots.includes(slot);
                  const isSelected = selectedTime === slot;
                  return (
                    <button
                      key={slot}
                      disabled={isOccupied}
                      onClick={() => {
                        setSelectedTime(slot);
                      }}
                      className={cn(
                        "h-14 rounded-2xl border flex items-center justify-center font-bold tracking-tight transition-all active:scale-95",
                        isOccupied 
                          ? "bg-white/5 border-transparent text-[#8E8E93]/20 cursor-not-allowed" 
                          : isSelected
                            ? "bg-[#D4AF37] border-[#D4AF37] text-[#0B0B0D] shadow-[0_10px_20px_rgba(212,175,55,0.2)]"
                            : "bg-[#1C1C1E] border-white/5 text-[#F5F5F7] hover:bg-[#2C2C2E]"
                      )}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>

              {selectedTime && (
                <div className="fixed bottom-0 left-0 right-0 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-[#0B0B0D]/90 backdrop-blur-xl border-t border-white/5 z-40">
                  <div className="max-w-xl mx-auto">
                    <Button onClick={() => setStep(4)} className="w-full h-14 rounded-2xl shadow-xl shadow-[#D4AF37]/20 text-[16px] font-bold">
                      Continuar Agendamento
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-6"
            >
              <div>
                <h1 className="text-3xl font-bold text-[#F5F5F7] tracking-tight">Meus dados</h1>
                <p className="text-[#8E8E93] text-[15px] mt-1">Quase lá! Preencha para confirmar</p>
              </div>
              
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-[2px] px-1">Seu Nome</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E8E93] group-focus-within:text-[#D4AF37] transition-colors" size={20} />
                    <input 
                      type="text" 
                      placeholder="Ex: Mariana Costa"
                      autoFocus
                      className="w-full bg-[#1C1C1E] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-[#F5F5F7] focus:outline-none focus:border-[#D4AF37] text-lg transition-all"
                      value={clientInfo.name}
                      onChange={e => setClientInfo({ ...clientInfo, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-[2px]">Seu WhatsApp</label>
                    {phoneError && <span className="text-[10px] text-red-500 font-bold uppercase tracking-tight">Formato inválido</span>}
                  </div>
                  <div className="relative group">
                    <Phone className={cn(
                      "absolute left-4 top-1/2 -translate-y-1/2 transition-colors",
                      phoneError ? "text-red-500" : "text-[#8E8E93] group-focus-within:text-[#D4AF37]"
                    )} size={20} />
                    <input 
                      type="tel" 
                      placeholder="(11) 99999-9999"
                      className={cn(
                        "w-full bg-[#1C1C1E] border rounded-2xl pl-12 pr-4 py-4 text-[#F5F5F7] focus:outline-none text-lg transition-all",
                        phoneError ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-[#D4AF37]"
                      )}
                      value={clientInfo.phone}
                      onChange={handlePhoneChange}
                      maxLength={15}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-[2px] px-1">Algum recado?</label>
                  <div className="relative group">
                    <MessageSquare className="absolute left-4 top-5 text-[#8E8E93] group-focus-within:text-[#D4AF37] transition-colors" size={20} />
                    <textarea 
                      placeholder="Observações ou dúvidas..."
                      className="w-full bg-[#1C1C1E] border border-white/10 rounded-2xl pl-12 pr-4 py-5 text-[#F5F5F7] focus:outline-none focus:border-[#D4AF37] min-h-[120px] text-lg transition-all"
                      value={clientInfo.notes}
                      onChange={e => setClientInfo({ ...clientInfo, notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-2 p-6 rounded-[28px] bg-[#D4AF37]/5 border border-[#D4AF37]/20 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                <p className="text-[11px] text-[#8E8E93] mb-3 uppercase font-black tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                  RESUMO DO AGENDAMENTO
                </p>
                <div className="flex flex-col gap-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-[#F5F5F7] font-bold text-xl tracking-tight">{selectedService?.name}</span>
                    <span className="text-[#D4AF37] font-black text-xl">R$ {selectedService?.price}</span>
                  </div>
                  <div className="flex items-center gap-6 text-[14px] text-[#8E8E93] mt-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#D4AF37]">
                        <Calendar size={16} />
                      </div>
                      <span className="font-bold text-[#F5F5F7]/90">{selectedDate?.toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#D4AF37]">
                        <Clock size={16} />
                      </div>
                      <span className="font-bold text-[#F5F5F7]/90">{selectedTime}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="fixed bottom-0 left-0 right-0 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-[#0B0B0D]/90 backdrop-blur-xl border-t border-white/5 z-40">
                <div className="max-w-xl mx-auto">
                  <Button 
                    onClick={handleBooking} 
                    loading={isSubmitting}
                    disabled={!clientInfo.name || !clientInfo.phone}
                    className="w-full h-14 rounded-2xl shadow-[0_15px_30px_rgba(212,175,55,0.25)] text-[16px] font-bold"
                  >
                    Confirmar Reserva
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Footer Branding inside main for natural scroll flow */}
        <footer className="p-12 text-center flex flex-col items-center gap-3">
          <Logo size="sm" className="opacity-20 grayscale brightness-200" />
          <p className="text-[11px] text-[#8E8E93] opacity-50 uppercase tracking-[3px] font-bold">
            Luxury Beauty Experience • {new Date().getFullYear()}
          </p>
        </footer>
      </main>

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          isVisible={!!toast} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}

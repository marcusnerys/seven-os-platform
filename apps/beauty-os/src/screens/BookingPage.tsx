import { useState, useEffect, useRef, ChangeEvent, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Clock,
  ChevronLeft,
  CheckCircle2,
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
  Star,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { Button, Toast } from '../components/UI';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

// ─── Types ───────────────────────────────────────────────
interface StudioInfo {
  studioName: string;
  location: string;
  avatarUrl: string;
  themeAccent: string;
  themeBg: 'dark' | 'light';
}

// ─── Constants ───────────────────────────────────────────
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
  { id: 'm1', name: 'Manicure', duration: 40, price: 50, category: 'unhas' },
  { id: 'p1', name: 'Pedicure', duration: 50, price: 60, category: 'unhas' },
  { id: 'a1', name: 'Alongamento em gel', duration: 120, price: 180, category: 'unhas' },
  { id: 'b1', name: 'Blindagem', duration: 60, price: 100, category: 'unhas' },
  { id: 'ec1', name: 'Extensão clássica', duration: 90, price: 150, category: 'cilios' },
  { id: 'vb1', name: 'Volume brasileiro', duration: 120, price: 180, category: 'cilios' },
  { id: 'll1', name: 'Lash lifting', duration: 60, price: 120, category: 'cilios' },
  { id: 'cf1', name: 'Corte feminino', duration: 60, price: 120, category: 'cabelo' },
  { id: 'e1', name: 'Escova', duration: 45, price: 80, category: 'cabelo' },
  { id: 'co1', name: 'Coloração', duration: 120, price: 200, category: 'cabelo' },
  { id: 'ds1', name: 'Design de sobrancelha', duration: 30, price: 50, category: 'sobrancelha' },
  { id: 'bl1', name: 'Brow lamination', duration: 60, price: 140, category: 'sobrancelha' },
  { id: 'lp1', name: 'Limpeza de pele', duration: 90, price: 180, category: 'estetica' },
  { id: 'ms1', name: 'Maquiagem social', duration: 90, price: 200, category: 'maquiagem' },
];

const TIME_SLOTS = ['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00','18:00'];

function getNextDays(count: number): Date[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 10) return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2').slice(0, 14);
  return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15);
}

function isPhoneValid(phone: string): boolean {
  return /^\(\d{2}\) \d{4,5}-\d{4}$/.test(phone);
}

// ─── Themed Colors Helper ─────────────────────────────────
function makeColors(accent: string, bg: 'dark' | 'light') {
  const isDark = bg === 'dark';
  return {
    pageBg: isDark ? '#0B0B0D' : '#F2F2F7',
    surface: isDark ? '#151518' : '#FFFFFF',
    surfaceAlt: isDark ? '#1C1C1E' : '#F0F0F5',
    textPrimary: isDark ? '#F5F5F7' : '#1C1C1E',
    textSecondary: isDark ? '#8E8E93' : '#6B6B70',
    border: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    accent,
    accentText: '#000000',
  };
}

// ─── Component ───────────────────────────────────────────
export default function BookingPage() {
  const { userId } = useParams();
  const [step, setStep] = useState(1); // 1=Serviço, 2=Data, 3=Horário, 4=Dados
  const [studio, setStudio] = useState<StudioInfo>({
    studioName: 'Studio',
    location: '',
    avatarUrl: '',
    themeAccent: '#D4AF37',
    themeBg: 'dark',
  });
  const [services, setServices] = useState<any[]>(DEFAULT_SERVICES);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [clientInfo, setClientInfo] = useState({ name: '', phone: '', notes: '' });
  const [honeypot, setHoneypot] = useState('');
  const [phoneError, setPhoneError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const step4EnteredAt = useRef<number>(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const colors = makeColors(studio.themeAccent, studio.themeBg);
  const availableDays = getNextDays(14);

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // ── Fetch studio info ──
  useEffect(() => {
    if (!userId || !UUID_REGEX.test(userId)) return;
    supabase.rpc('beautyos_public_settings', { p_empresa_id: userId }).then(({ data }) => {
      const s = data?.[0];
      if (s) {
        setStudio({
          studioName: s.studio_name || 'Studio',
          location: s.location || '',
          avatarUrl: s.avatar_url || '',
          themeAccent: s.theme_accent || '#D4AF37',
          themeBg: s.theme_bg || 'dark',
        });
      }
    });
    supabase.rpc('beautyos_public_services', { p_empresa_id: userId }).then(({ data }) => {
      if (data && data.length > 0) {
        const list = data.map((r: any) => ({ id: r.id, name: r.name, price: Number(r.price) || 0, duration: r.duration, category: r.category || 'unhas' }));
        setServices(list);
      }
    });
  }, [userId]);

  // ── Fetch occupied slots ──
  useEffect(() => {
    if (!selectedDate || !userId) return;
    const dateStr = selectedDate.toISOString().split('T')[0];
    supabase.rpc('beautyos_public_slots', { p_empresa_id: userId, p_date: dateStr }).then(({ data }) => {
      setOccupiedSlots((data ?? []).map((r: any) => r.time));
    });
  }, [selectedDate, userId]);

  const filteredServices = useMemo(() => services.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = activeCategory === 'all' || s.category === activeCategory;
    return matchSearch && matchCat;
  }), [services, searchQuery, activeCategory]);

  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setClientInfo(prev => ({ ...prev, phone: formatted }));
    if (formatted.length > 0) setPhoneError(!isPhoneValid(formatted));
    else setPhoneError(false);
  };

  const handleBooking = async () => {
    // honeypot: bots preenchem o campo oculto, humanos não
    if (honeypot) return;

    // tempo mínimo de 2s na etapa de confirmação
    if (Date.now() - step4EnteredAt.current < 2000) return;

    // cooldown: bloqueia nova tentativa por 60s após envio
    const COOLDOWN_KEY = `booking_cooldown_${userId}`;
    const lastSent = parseInt(localStorage.getItem(COOLDOWN_KEY) ?? '0', 10);
    if (Date.now() - lastSent < 60_000) {
      setToast({ message: 'Aguarde um momento antes de tentar novamente.', type: 'error' });
      return;
    }

    if (!userId || !selectedService || !selectedDate || !selectedTime) {
      setToast({ message: 'Preencha todos os campos.', type: 'error' });
      return;
    }
    if (!clientInfo.name.trim()) {
      setToast({ message: 'Por favor, informe seu nome.', type: 'error' });
      return;
    }
    if (clientInfo.phone && !isPhoneValid(clientInfo.phone)) { setPhoneError(true); return; }
    setIsSubmitting(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const { data: rpcResult, error: apptError } = await supabase.rpc(
        'beautyos_create_appointment_ratelimited',
        {
          p_empresa_id:   userId,
          p_client_name:  clientInfo.name,
          p_client_phone: clientInfo.phone || null,
          p_service:      selectedService.name,
          p_date:         dateStr,
          p_time:         selectedTime,
          p_price:        selectedService.price,
          p_duration:     selectedService.duration,
          p_notes:        clientInfo.notes || null,
        }
      );
      if (apptError) throw apptError;
      if ((rpcResult as any)?.error === 'rate_limit_phone' || (rpcResult as any)?.error === 'rate_limit_studio') {
        setToast({ message: 'Muitas tentativas. Aguarde um pouco e tente novamente.', type: 'error' });
        return;
      }
      await supabase.from('beautyos_notifications').insert({
        empresa_id: userId,
        title: 'Nova reserva recebida',
        message: `${selectedService.name} • ${selectedTime}\nCliente: ${clientInfo.name}`,
        type: 'booking',
        read: false,
      });
      localStorage.setItem(`booking_cooldown_${userId}`, String(Date.now()));
      setIsSuccess(true);
    } catch {
      setToast({ message: 'Erro ao realizar agendamento. Tente novamente.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Success screen ──
  if (isSuccess) {
    const msg = `Olá, ${studio.studioName}! 😊\n\nAcabei de fazer uma reserva:\n\n✨ *${selectedService?.name}*\n📅 ${selectedDate?.toLocaleDateString('pt-BR')} às ${selectedTime}\n\nPor favor, confirme meu horário! 🙏`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;

    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] p-8 text-center" style={{ background: colors.pageBg }}>
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300 }}
          className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
          style={{ background: `${colors.accent}20` }}
        >
          <CheckCircle2 size={52} style={{ color: colors.accent }} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h1 className="text-[28px] font-black tracking-tight mb-2" style={{ color: colors.textPrimary }}>Reserva Enviada!</h1>
          <p className="text-[15px] leading-relaxed mb-2" style={{ color: colors.textSecondary }}>
            Sua solicitação para <strong style={{ color: colors.textPrimary }}>{selectedService?.name}</strong> foi recebida.
          </p>
          <p className="text-[13px] mb-8" style={{ color: colors.textSecondary }}>
            Aguarde a confirmação de <strong style={{ color: colors.accent }}>{studio.studioName}</strong>.
          </p>
        </motion.div>

        <div className="w-full max-w-xs flex flex-col gap-3">
          <div className="p-4 rounded-2xl mb-2" style={{ background: colors.surface }}>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: colors.accent }}>Resumo</p>
            <div className="flex flex-col gap-2 text-left">
              <div className="flex justify-between">
                <span style={{ color: colors.textSecondary }} className="text-[13px]">Serviço</span>
                <span className="text-[13px] font-bold" style={{ color: colors.textPrimary }}>{selectedService?.name}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: colors.textSecondary }} className="text-[13px]">Data</span>
                <span className="text-[13px] font-bold" style={{ color: colors.textPrimary }}>{selectedDate?.toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: colors.textSecondary }} className="text-[13px]">Horário</span>
                <span className="text-[13px] font-bold" style={{ color: colors.textPrimary }}>{selectedTime}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: colors.textSecondary }} className="text-[13px]">Valor</span>
                <span className="text-[13px] font-bold" style={{ color: colors.accent }}>R$ {selectedService?.price}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => window.open(waUrl, '_blank')}
            className="w-full h-14 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2"
            style={{ background: '#25D366', color: '#fff' }}
          >
            <MessageCircle size={20} />
            Avisar pelo WhatsApp
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full h-12 rounded-2xl text-[14px] font-medium"
            style={{ color: colors.textSecondary, background: colors.surface }}
          >
            Fazer outro agendamento
          </button>
        </div>
      </div>
    );
  }

  // ── Page shell ──
  return (
    <div className="max-w-xl mx-auto w-full min-h-[100dvh] flex flex-col overflow-hidden" style={{ background: colors.pageBg, color: colors.textPrimary }}>

      {/* Header */}
      <header className="px-5 py-4 flex items-center justify-between shrink-0 sticky top-0 z-30 backdrop-blur-xl border-b"
        style={{ background: `${colors.pageBg}CC`, borderColor: colors.border }}
      >
        <div className="flex items-center gap-3">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} className="w-8 h-8 flex items-center justify-center rounded-full active:scale-90 transition-transform"
              style={{ background: colors.surface }}
            >
              <ChevronLeft size={18} style={{ color: colors.textPrimary }} />
            </button>
          )}
          <div className="flex items-center gap-2.5">
            {studio.avatarUrl ? (
              <img src={studio.avatarUrl} alt={studio.studioName} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-black" style={{ background: colors.accent, color: colors.accentText }}>
                {studio.studioName.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-[14px] font-bold leading-tight" style={{ color: colors.textPrimary }}>{studio.studioName}</p>
              {studio.location && (
                <p className="text-[10px] flex items-center gap-1" style={{ color: colors.textSecondary }}>
                  <MapPin size={9} /> {studio.location}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: step === s ? 20 : 6,
                background: step >= s ? colors.accent : colors.border,
              }}
            />
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-32">
        <AnimatePresence mode="wait">

          {/* ── Step 1: Serviços ── */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex flex-col gap-5">
              <div>
                <h1 className="text-[26px] font-black tracking-tight" style={{ color: colors.textPrimary }}>Que serviço você quer?</h1>
                <p className="text-[14px] mt-0.5" style={{ color: colors.textSecondary }}>Escolha o atendimento desejado</p>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2" size={18} style={{ color: colors.textSecondary }} />
                <input
                  type="text"
                  placeholder="Buscar serviço..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl pl-11 pr-4 py-3.5 text-[15px] border focus:outline-none"
                  style={{ background: colors.surface, borderColor: colors.border, color: colors.textPrimary }}
                />
              </div>

              {/* Categories */}
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-5 px-5">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  const isActive = activeCategory === cat.id;
                  return (
                    <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full whitespace-nowrap text-[13px] font-bold border transition-all active:scale-95 shrink-0"
                      style={{
                        background: isActive ? colors.accent : colors.surface,
                        borderColor: isActive ? colors.accent : colors.border,
                        color: isActive ? colors.accentText : colors.textSecondary,
                      }}
                    >
                      <Icon size={14} />
                      {cat.name}
                    </button>
                  );
                })}
              </div>

              {/* Service list */}
              <div className="flex flex-col gap-3">
                {filteredServices.map(service => {
                  const catInfo = CATEGORIES.find(c => c.id === service.category);
                  const Icon = catInfo?.icon || Sparkles;
                  return (
                    <motion.button
                      key={service.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => { setSelectedService(service); setStep(2); }}
                      className="w-full text-left p-4 rounded-2xl border flex items-center gap-4 active:scale-[0.98] transition-transform"
                      style={{ background: colors.surface, borderColor: colors.border }}
                    >
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${colors.accent}18` }}>
                        <Icon size={22} style={{ color: colors.accent }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-bold truncate" style={{ color: colors.textPrimary }}>{service.name}</p>
                        <p className="text-[12px] flex items-center gap-2 mt-0.5" style={{ color: colors.textSecondary }}>
                          <Clock size={11} /> {service.duration} min
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[15px] font-black" style={{ color: colors.accent }}>R$ {service.price}</p>
                        <p className="text-[10px]" style={{ color: colors.textSecondary }}>a partir de</p>
                      </div>
                    </motion.button>
                  );
                })}
                {filteredServices.length === 0 && (
                  <p className="text-center py-16 text-[14px]" style={{ color: colors.textSecondary }}>Nenhum serviço encontrado.</p>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Data ── */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-5">
              {/* Selected service reminder */}
              <div className="p-3 rounded-xl flex items-center gap-3" style={{ background: `${colors.accent}15` }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: colors.accent }}>
                  <Sparkles size={16} color="#000" />
                </div>
                <div>
                  <p className="text-[13px] font-bold" style={{ color: colors.textPrimary }}>{selectedService?.name}</p>
                  <p className="text-[11px]" style={{ color: colors.textSecondary }}>{selectedService?.duration} min • R$ {selectedService?.price}</p>
                </div>
              </div>

              <div>
                <h1 className="text-[26px] font-black tracking-tight" style={{ color: colors.textPrimary }}>Qual o melhor dia?</h1>
                <p className="text-[14px] mt-0.5" style={{ color: colors.textSecondary }}>Próximos 14 dias disponíveis</p>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {availableDays.map(date => {
                  const isSelected = selectedDate?.toDateString() === date.toDateString();
                  const isToday = date.toDateString() === new Date().toDateString();
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => setSelectedDate(date)}
                      className="flex flex-col items-center justify-center gap-0.5 py-3 rounded-2xl border transition-all active:scale-90"
                      style={{
                        background: isSelected ? colors.accent : colors.surface,
                        borderColor: isSelected ? colors.accent : isToday ? `${colors.accent}50` : colors.border,
                        boxShadow: isSelected ? `0 8px 20px ${colors.accent}30` : undefined,
                      }}
                    >
                      <span className="text-[9px] font-bold uppercase tracking-widest"
                        style={{ color: isSelected ? `${colors.accentText}80` : colors.textSecondary }}>
                        {date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                      </span>
                      <span className="text-[20px] font-black leading-tight" style={{ color: isSelected ? colors.accentText : colors.textPrimary }}>
                        {date.getDate()}
                      </span>
                      <span className="text-[9px] font-bold uppercase" style={{ color: isSelected ? `${colors.accentText}80` : colors.accent }}>
                        {date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                      </span>
                      {isToday && !isSelected && <div className="w-1 h-1 rounded-full mt-0.5" style={{ background: colors.accent }} />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Horário ── */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-5">
              {/* Reminder */}
              <div className="p-3 rounded-xl flex items-center gap-3" style={{ background: `${colors.accent}15` }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: colors.accent }}>
                  <Calendar size={16} color="#000" />
                </div>
                <div>
                  <p className="text-[13px] font-bold" style={{ color: colors.textPrimary }}>{selectedService?.name}</p>
                  <p className="text-[11px]" style={{ color: colors.textSecondary }}>{selectedDate?.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
              </div>

              <div>
                <h1 className="text-[26px] font-black tracking-tight" style={{ color: colors.textPrimary }}>Escolha o horário</h1>
                <p className="text-[14px] mt-0.5" style={{ color: colors.textSecondary }}>Horários disponíveis</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {TIME_SLOTS.map(slot => {
                  const occupied = occupiedSlots.includes(slot);
                  const selected = selectedTime === slot;
                  return (
                    <button
                      key={slot}
                      disabled={occupied}
                      onClick={() => setSelectedTime(slot)}
                      className="h-14 rounded-2xl border font-bold text-[15px] tracking-tight transition-all active:scale-95"
                      style={{
                        background: occupied ? colors.border : selected ? colors.accent : colors.surface,
                        borderColor: occupied ? 'transparent' : selected ? colors.accent : colors.border,
                        color: occupied ? `${colors.textSecondary}40` : selected ? colors.accentText : colors.textPrimary,
                        cursor: occupied ? 'not-allowed' : 'pointer',
                        boxShadow: selected ? `0 8px 20px ${colors.accent}30` : undefined,
                        textDecoration: occupied ? 'line-through' : undefined,
                      }}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── Step 4: Dados ── */}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-5">
              <div>
                <h1 className="text-[26px] font-black tracking-tight" style={{ color: colors.textPrimary }}>Seus dados</h1>
                <p className="text-[14px] mt-0.5" style={{ color: colors.textSecondary }}>Quase lá! Preencha para confirmar</p>
              </div>

              {/* Booking summary */}
              <div className="p-4 rounded-2xl border" style={{ background: colors.surface, borderColor: colors.border }}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: colors.accent }}>
                  <span className="w-1 h-3 rounded-full" style={{ background: colors.accent }} />
                  Resumo da reserva
                </p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[16px] font-bold" style={{ color: colors.textPrimary }}>{selectedService?.name}</span>
                  <span className="text-[16px] font-black" style={{ color: colors.accent }}>R$ {selectedService?.price}</span>
                </div>
                <div className="flex items-center gap-4 text-[13px]" style={{ color: colors.textSecondary }}>
                  <span className="flex items-center gap-1.5"><Calendar size={13} style={{ color: colors.accent }} /> {selectedDate?.toLocaleDateString('pt-BR')}</span>
                  <span className="flex items-center gap-1.5"><Clock size={13} style={{ color: colors.accent }} /> {selectedTime}</span>
                </div>
              </div>

              {/* honeypot — invisível para humanos, bots preenchem */}
              <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
                <input type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={e => setHoneypot(e.target.value)} />
              </div>

              <div className="flex flex-col gap-4">
                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest px-1" style={{ color: colors.textSecondary }}>Seu nome</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2" size={18} style={{ color: colors.textSecondary }} />
                    <input
                      type="text"
                      placeholder="Ex: Mariana Costa"
                      autoFocus
                      value={clientInfo.name}
                      onChange={e => setClientInfo(p => ({ ...p, name: e.target.value }))}
                      maxLength={100}
                      className="w-full rounded-2xl pl-11 pr-4 py-4 text-[16px] border focus:outline-none"
                      style={{ background: colors.surface, borderColor: colors.border, color: colors.textPrimary }}
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: colors.textSecondary }}>WhatsApp (opcional)</label>
                    {phoneError && <span className="text-[10px] text-red-500 font-bold uppercase">Número inválido</span>}
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2" size={18} style={{ color: phoneError ? '#EF4444' : colors.textSecondary }} />
                    <input
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={clientInfo.phone}
                      onChange={handlePhoneChange}
                      maxLength={15}
                      className="w-full rounded-2xl pl-11 pr-4 py-4 text-[16px] border focus:outline-none"
                      style={{ background: colors.surface, borderColor: phoneError ? '#EF4444' : colors.border, color: colors.textPrimary }}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest px-1" style={{ color: colors.textSecondary }}>Observações (opcional)</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-4 top-4" size={18} style={{ color: colors.textSecondary }} />
                    <textarea
                      placeholder="Alguma preferência ou dúvida..."
                      value={clientInfo.notes}
                      onChange={e => setClientInfo(p => ({ ...p, notes: e.target.value }))}
                      maxLength={500}
                      className="w-full rounded-2xl pl-11 pr-4 py-4 text-[15px] border focus:outline-none min-h-[90px] resize-none"
                      style={{ background: colors.surface, borderColor: colors.border, color: colors.textPrimary }}
                    />
                  </div>
                </div>
              </div>

              {/* Trust badge */}
              <div className="flex items-center gap-2 px-1" style={{ color: colors.textSecondary }}>
                <ShieldCheck size={14} style={{ color: colors.accent }} />
                <p className="text-[11px]">Seus dados são usados apenas para confirmar o agendamento</p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl border-t"
        style={{ background: `${colors.pageBg}DD`, borderColor: colors.border }}
      >
        <div className="max-w-xl mx-auto px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {step === 2 && selectedDate && (
            <button onClick={() => setStep(3)} className="w-full h-14 rounded-2xl font-bold text-[16px] active:scale-[0.98] transition-transform"
              style={{ background: colors.accent, color: colors.accentText, boxShadow: `0 10px 30px ${colors.accent}40` }}
            >
              Escolher Horário
            </button>
          )}
          {step === 3 && selectedTime && (
            <button onClick={() => { setStep(4); step4EnteredAt.current = Date.now(); }} className="w-full h-14 rounded-2xl font-bold text-[16px] active:scale-[0.98] transition-transform"
              style={{ background: colors.accent, color: colors.accentText, boxShadow: `0 10px 30px ${colors.accent}40` }}
            >
              Preencher Dados
            </button>
          )}
          {step === 4 && (
            <button
              onClick={handleBooking}
              disabled={!clientInfo.name.trim() || isSubmitting}
              className="w-full h-14 rounded-2xl font-bold text-[16px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              style={{
                background: !clientInfo.name.trim() ? colors.border : colors.accent,
                color: !clientInfo.name.trim() ? colors.textSecondary : colors.accentText,
                boxShadow: clientInfo.name.trim() ? `0 10px 30px ${colors.accent}40` : undefined,
              }}
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                'Confirmar Reserva'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Branding footer */}
      <div className="pb-28 text-center">
        <p className="text-[10px] uppercase tracking-[3px] font-bold" style={{ color: `${colors.textSecondary}50` }}>
          Leshanot Studio
        </p>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} isVisible={!!toast} onClose={() => setToast(null)} />}
    </div>
  );
}

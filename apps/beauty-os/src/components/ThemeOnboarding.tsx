import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../lib/store';
import { Check, Sun, Moon, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { BUSINESS_TYPES, VERTICALS, type BusinessType } from '../lib/vertical';

const ACCENT_COLORS = [
  { name: 'Dourado', value: '#D4AF37', neon: '#F5D062', label: 'Clássico' },
  { name: 'Rosa', value: '#FF6B9D', neon: '#FF2D78', label: 'Rosa' },
  { name: 'Ciano', value: '#00E6FF', neon: '#00C8FF', label: 'Azul' },
  { name: 'Laranja', value: '#FF7043', neon: '#FF4500', label: 'Laranja' },
  { name: 'Roxo', value: '#9B59B6', neon: '#A855F7', label: 'Roxo' },
];

const MAX_NAME_LENGTH = 60;
const STEPS = ['type', 'name', 'bg', 'color'] as const;
type Step = typeof STEPS[number];

function applyTheme(accent: string, bg: 'dark' | 'light') {
  const root = document.documentElement;
  root.style.setProperty('--color-ios-gold', accent);

  if (bg === 'dark') {
    root.style.setProperty('--color-ios-bg', '#0B0B0D');
    root.style.setProperty('--color-ios-surface', '#151518');
    root.style.setProperty('--color-ios-text-primary', '#F5F5F7');
    root.style.setProperty('--color-ios-text-secondary', '#8E8E93');
    root.style.setProperty('--color-ios-border', 'rgba(255,255,255,0.06)');
    root.style.setProperty('--color-ios-glass', 'rgba(255,255,255,0.04)');
  } else {
    root.style.setProperty('--color-ios-bg', '#F2F2F7');
    root.style.setProperty('--color-ios-surface', '#FFFFFF');
    root.style.setProperty('--color-ios-text-primary', '#1C1C1E');
    root.style.setProperty('--color-ios-text-secondary', '#6B6B70');
    root.style.setProperty('--color-ios-border', 'rgba(0,0,0,0.08)');
    root.style.setProperty('--color-ios-glass', 'rgba(0,0,0,0.03)');
  }
}

const STEP_TITLES: Record<Step, string> = {
  type: 'Que tipo de negócio você toca?',
  name: 'Como ele se chama?',
  bg: 'Escolha o fundo',
  color: 'Escolha sua cor',
};

export function Onboarding() {
  const setTheme = useStore(state => state.setTheme);
  const setHasChosenTheme = useStore(state => state.setHasChosenTheme);
  const setHasOnboarded = useStore(state => state.setHasOnboarded);
  const updateSettings = useStore(state => state.updateSettings);
  const setToast = useStore(state => state.setToast);
  const settings = useStore(state => state.settings);

  const [stepIndex, setStepIndex] = useState(0);
  const [businessType, setBusinessType] = useState<BusinessType>(settings.businessType ?? 'generic');
  const [businessName, setBusinessName] = useState(
    settings.studioName && settings.studioName !== 'Meu Negócio' ? settings.studioName : ''
  );
  const [selectedAccent, setSelectedAccent] = useState(ACCENT_COLORS[0].value);
  const [selectedBg, setSelectedBg] = useState<'dark' | 'light'>('dark');
  const [saving, setSaving] = useState(false);

  const step = STEPS[stepIndex];
  const vertical = VERTICALS[businessType];

  const textPrimary = selectedBg === 'dark' ? '#F5F5F7' : '#1C1C1E';
  const textSecondary = selectedBg === 'dark' ? '#8E8E93' : '#6B6B70';
  const surface = selectedBg === 'dark' ? '#151518' : '#FFFFFF';

  const handleSelectBg = (bg: 'dark' | 'light') => {
    setSelectedBg(bg);
    applyTheme(selectedAccent, bg);
  };

  const handleSelectAccent = (color: string) => {
    setSelectedAccent(color);
    applyTheme(color, selectedBg);
  };

  const canAdvance = step === 'name' ? businessName.trim().length > 0 : true;

  const handleFinish = async () => {
    setSaving(true);
    try {
      setTheme(selectedAccent, selectedBg);
      await updateSettings({ studioName: businessName.trim(), businessType });
    } catch (error) {
      // Uma falha de gravação não pode prender o usuário na última tela do
      // onboarding. As escolhas já ficaram aplicadas localmente, então o app
      // abre normalmente e avisamos que a sincronização não foi.
      console.error('Onboarding: falha ao sincronizar configurações', error);
      setToast({
        message: 'Não deu para salvar no servidor. Suas escolhas valem neste aparelho — revise em Mais → Configurações.',
        type: 'error',
      });
    } finally {
      setHasChosenTheme(true);
      setHasOnboarded(true);
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-between p-6 pt-14 pb-10 overflow-y-auto"
      style={{ background: selectedBg === 'dark' ? '#0B0B0D' : '#F2F2F7' }}
    >
      {/* Cabeçalho */}
      <div className="text-center w-full max-w-sm">
        <h1 className="text-[28px] font-black tracking-tight leading-tight" style={{ color: textPrimary }}>
          {stepIndex === 0 ? 'Vamos configurar' : STEP_TITLES[step]}
        </h1>
        <p className="text-[13px] mt-2" style={{ color: textSecondary }}>
          {stepIndex === 0 ? STEP_TITLES.type : `Passo ${stepIndex + 1} de ${STEPS.length}`}
        </p>

        {/* Progresso */}
        <div className="flex items-center justify-center gap-1.5 mt-5">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === stepIndex ? 24 : 8,
                background: i <= stepIndex ? selectedAccent : (selectedBg === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'),
              }}
            />
          ))}
        </div>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-6 my-8">
        <AnimatePresence mode="wait">
          {step === 'type' && (
            <motion.div key="type" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-3">
              {BUSINESS_TYPES.map(type => {
                const config = VERTICALS[type];
                const isSelected = businessType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setBusinessType(type)}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98]',
                      isSelected ? 'shadow-lg' : 'opacity-70'
                    )}
                    style={{
                      background: surface,
                      borderColor: isSelected ? selectedAccent : 'transparent',
                    }}
                  >
                    <span className="text-[26px] leading-none">{config.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-bold leading-tight" style={{ color: textPrimary }}>{config.label}</p>
                      <p className="text-[11px] mt-0.5 leading-snug" style={{ color: textSecondary }}>{config.tagline}</p>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: selectedAccent }}>
                        <Check size={13} color="#000" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </motion.div>
          )}

          {step === 'name' && (
            <motion.div key="name" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-3">
              <label className="text-[11px] font-bold uppercase tracking-widest px-1" style={{ color: textSecondary }}>
                {vertical.businessNameLabel}
              </label>
              <input
                autoFocus
                type="text"
                maxLength={MAX_NAME_LENGTH}
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && canAdvance) setStepIndex(stepIndex + 1); }}
                placeholder={vertical.businessNamePlaceholder}
                className="w-full rounded-2xl px-5 py-4 text-[17px] font-semibold focus:outline-none"
                style={{
                  background: surface,
                  color: textPrimary,
                  border: `2px solid ${businessName.trim() ? selectedAccent : 'transparent'}`,
                }}
              />
              <p className="text-[11px] px-1" style={{ color: textSecondary }}>
                Aparece no app e no seu link público de agendamento.
              </p>
            </motion.div>
          )}

          {step === 'bg' && (
            <motion.div key="bg" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: 'dark' as const, label: 'Escuro', icon: Moon, bg: '#0B0B0D', text: '#F5F5F7' },
                  { value: 'light' as const, label: 'Claro', icon: Sun, bg: '#F2F2F7', text: '#1C1C1E' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleSelectBg(opt.value)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all active:scale-95',
                      selectedBg === opt.value ? 'shadow-lg' : 'opacity-60'
                    )}
                    style={{ background: opt.bg, borderColor: selectedBg === opt.value ? selectedAccent : 'transparent' }}
                  >
                    <opt.icon size={28} style={{ color: opt.text }} />
                    <span className="text-[13px] font-bold" style={{ color: opt.text }}>{opt.label}</span>
                    {selectedBg === opt.value && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: selectedAccent }}>
                        <Check size={12} color="#000" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'color' && (
            <motion.div key="color" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="grid grid-cols-5 gap-3">
                {ACCENT_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => handleSelectAccent(c.value)}
                    className="flex flex-col items-center gap-2 active:scale-90 transition-transform"
                  >
                    <div
                      className={cn(
                        'w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all',
                        selectedAccent === c.value ? 'border-white scale-110 shadow-lg' : 'border-transparent'
                      )}
                      style={{
                        background: `radial-gradient(circle at 30% 30%, ${c.neon}, ${c.value})`,
                        boxShadow: selectedAccent === c.value ? `0 0 20px ${c.value}80` : undefined,
                      }}
                    >
                      {selectedAccent === c.value && <Check size={16} color="#fff" strokeWidth={3} />}
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: textSecondary }}>
                      {c.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Prévia com os dados reais escolhidos */}
              <div className="mt-6 p-4 rounded-2xl flex items-center gap-3" style={{ background: surface }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: selectedAccent }}>
                  <span className="text-[16px] leading-none">{vertical.icon}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold truncate" style={{ color: textPrimary }}>
                    {businessName.trim() || vertical.businessNamePlaceholder}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide" style={{ color: selectedAccent }}>
                    {vertical.label}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ações */}
      <div className="w-full max-w-sm flex flex-col gap-2">
        {stepIndex < STEPS.length - 1 ? (
          <button
            onClick={() => setStepIndex(stepIndex + 1)}
            disabled={!canAdvance}
            className="w-full h-14 rounded-2xl font-bold text-[16px] text-black transition-all active:scale-95 disabled:opacity-40"
            style={{ background: selectedAccent }}
          >
            Próximo
          </button>
        ) : (
          <button
            onClick={handleFinish}
            disabled={saving}
            className="w-full h-14 rounded-2xl font-bold text-[16px] text-black transition-all active:scale-95 disabled:opacity-60"
            style={{ background: selectedAccent }}
          >
            {saving ? 'Salvando...' : 'Começar a usar'}
          </button>
        )}

        {stepIndex > 0 && (
          <button
            onClick={() => setStepIndex(stepIndex - 1)}
            className="w-full h-10 text-[13px] font-medium flex items-center justify-center gap-1.5"
            style={{ color: textSecondary }}
          >
            <ArrowLeft size={14} /> Voltar
          </button>
        )}
      </div>
    </motion.div>
  );
}

export { applyTheme };

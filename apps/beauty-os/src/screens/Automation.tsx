import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard, Button, Toast, Modal } from '../components/UI';
import {
  MessageCircle,
  ChevronLeft,
  Save,
  Play,
  Type,
  Eye,
  CheckCircle2,
  AlertCircle,
  Megaphone,
  Users,
  Send,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore, AutomationTemplate } from '../lib/store';
import { resolveMessage, openWhatsApp } from '../lib/whatsapp';

export default function Automation() {
  const setActiveTab = useStore(state => state.setActiveTab);
  const templates = useStore(state => state.automationTemplates);
  const updateTemplate = useStore(state => state.updateAutomationTemplate);
  const clients = useStore(state => state.clients);
  const appointments = useStore(state => state.appointments);

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Campaign state
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campaignSegment, setCampaignSegment] = useState<'all' | 'today' | 'tomorrow' | 'noshow'>('all');
  const [campaignMessage, setCampaignMessage] = useState('Olá {{nome}}! 💛 Temos uma promoção especial para você na Leshanot Studio. Entre em contato para saber mais!');
  const [campaignRecipients, setCampaignRecipients] = useState<Array<{ name: string; phone: string }>>([]);
  const [campaignStep, setCampaignStep] = useState<'compose' | 'recipients'>('compose');

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const buildRecipients = () => {
    let phones = new Map<string, string>();
    if (campaignSegment === 'all') {
      clients.forEach(c => { if (c.phone) phones.set(c.phone, c.name); });
    } else if (campaignSegment === 'today') {
      appointments.filter(a => a.date === todayStr && a.status !== 'Cancelado').forEach(a => {
        const phone = clients.find(c => c.id === a.clientId)?.phone || a.clientPhone;
        const name = clients.find(c => c.id === a.clientId)?.name || a.clientName || 'Cliente';
        if (phone) phones.set(phone, name);
      });
    } else if (campaignSegment === 'tomorrow') {
      appointments.filter(a => a.date === tomorrowStr && a.status !== 'Cancelado').forEach(a => {
        const phone = clients.find(c => c.id === a.clientId)?.phone || a.clientPhone;
        const name = clients.find(c => c.id === a.clientId)?.name || a.clientName || 'Cliente';
        if (phone) phones.set(phone, name);
      });
    } else if (campaignSegment === 'noshow') {
      appointments.filter(a => a.status === 'Cancelado').forEach(a => {
        const phone = clients.find(c => c.id === a.clientId)?.phone || a.clientPhone;
        const name = clients.find(c => c.id === a.clientId)?.name || a.clientName || 'Cliente';
        if (phone) phones.set(phone, name);
      });
    }
    return Array.from(phones.entries()).map(([phone, name]) => ({ phone, name }));
  };

  const handlePrepareCampaign = () => {
    const recipients = buildRecipients();
    if (!recipients.length) {
      setToast({ message: 'Nenhum contato com telefone neste segmento', type: 'error' });
      return;
    }
    setCampaignRecipients(recipients);
    setCampaignStep('recipients');
  };

  const sendToContact = (name: string, phone: string) => {
    const msg = campaignMessage.replace(/{{nome}}/g, name.split(' ')[0]);
    openWhatsApp(phone, msg);
  };

  const handleToggle = async (template: AutomationTemplate) => {
    try {
      await updateTemplate(template.id, { isActive: !template.isActive });
      setToast({ 
        message: `${template.title} ${!template.isActive ? 'ativado' : 'desativado'}`, 
        type: 'success' 
      });
    } catch (err) {
      setToast({ message: "Erro ao atualizar automação", type: 'error' });
    }
  };

  const handleSave = async (id: string, message: string) => {
    setLoadingId(id);
    try {
      await updateTemplate(id, { message });
      setToast({ message: "Mensagem salva com sucesso", type: 'success' });
    } catch (err) {
      setToast({ message: "Erro ao salvar mensagem", type: 'error' });
    } finally {
      setLoadingId(null);
    }
  };

  const showPreview = (template: AutomationTemplate) => {
    const resolved = resolveMessage(template.message, {
      nome: 'Juliana Silva',
      servico: 'Design de Sobrancelhas',
      data: '15/05/2026',
      hora: '14:00',
      empresa: 'LESHANOT STUDIO'
    });
    setPreviewContent(resolved);
    setIsPreviewOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-ios-bg overflow-y-auto hide-scrollbar pb-12">
      {/* Header */}
      <header className="p-6 pt-8 pb-4 flex flex-col bg-ios-bg/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center gap-3 mb-4">
          <button 
            onClick={() => setActiveTab('more')}
            className="p-2 -ml-2 text-ios-gold/70 hover:text-ios-gold active:opacity-50 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-[24px] font-bold tracking-tightest text-white leading-tight">Automação WhatsApp</h1>
          </div>
        </div>
        <p className="text-[13px] text-ios-text-secondary leading-relaxed max-w-[280px]">
          Automatize confirmações, lembretes e relacionamento com suas clientes.
        </p>
      </header>

      <div className="px-6 flex flex-col gap-6 pt-2">
        {[...templates].sort((a, b) => {
            const order = ['welcome', 'confirmation', 'reminder', 'post_attendance', 'birthday', 'custom'];
            return order.indexOf(a.type) - order.indexOf(b.type);
        }).map((template) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlassCard className="p-5 flex flex-col gap-4 border-none bg-ios-surface/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg bg-white/5",
                    template.isActive ? "text-ios-gold" : "text-white/20"
                  )}>
                    <MessageCircle size={18} />
                  </div>
                  <h3 className="font-bold text-[16px] text-white tracking-tight">{template.title}</h3>
                </div>
                <div className="flex items-center gap-4">
                  {template.type === 'birthday' && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-ios-gold/10 border border-ios-gold/20">
                      <div className="w-1 h-1 rounded-full bg-ios-gold animate-pulse" />
                      <span className="text-[10px] font-bold text-ios-gold uppercase">Gatilho: 09:00</span>
                    </div>
                  )}
                  <button 
                    onClick={() => handleToggle(template)}
                  className={cn(
                    "w-12 h-6 rounded-full relative transition-colors duration-200",
                    template.isActive ? "bg-ios-gold" : "bg-white/10"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200",
                    template.isActive ? "left-7" : "left-1"
                  )} />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                   <span className="text-[10px] font-bold text-ios-text-secondary uppercase tracking-wider">Mensagem</span>
                   <div className="flex items-center gap-1 opacity-50">
                      <Type size={10} />
                      <span className="text-[9px] font-medium tracking-tight text-ios-text-secondary/60">Variáveis: {"{{saudacao}}, {{nome}}, {{servico}}, {{data}}, {{hora}}, {{empresa}}"}</span>
                   </div>
                </div>
                <textarea 
                  className="w-full bg-black/20 border border-white/5 rounded-xl p-4 text-[14px] text-white/90 min-h-[120px] focus:outline-none focus:border-ios-gold/30 transition-colors leading-relaxed"
                  value={template.message}
                  onChange={(e) => {
                    const newTemplates = templates.map(t => t.id === template.id ? { ...t, message: e.target.value } : t);
                    useStore.setState({ automationTemplates: newTemplates });
                  }}
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="secondary" 
                  className="flex-1 h-12 bg-white/5 border-white/5"
                  onClick={() => showPreview(template)}
                >
                  <Eye size={16} />
                  Preview
                </Button>
                <Button 
                  className="flex-1 h-12"
                  onClick={() => handleSave(template.id, template.message)}
                  loading={loadingId === template.id}
                >
                  <Save size={16} />
                  Salvar
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        ))}

        {/* Campaigns Section */}
        <div className="mt-2">
          <button
            onClick={() => setCampaignOpen(v => !v)}
            className="w-full flex items-center justify-between p-5 rounded-[20px] bg-ios-surface/60 border border-ios-border active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-ios-gold/10 text-ios-gold">
                <Megaphone size={18} />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-[16px] text-white">Campanhas</h3>
                <p className="text-[11px] text-ios-text-secondary mt-0.5">Disparo manual para segmentos de clientes</p>
              </div>
            </div>
            {campaignOpen ? <ChevronUp size={18} className="text-ios-text-secondary" /> : <ChevronDown size={18} className="text-ios-text-secondary" />}
          </button>

          <AnimatePresence>
            {campaignOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-3 flex flex-col gap-4">
                  {campaignStep === 'compose' ? (
                    <>
                      {/* Segment selector */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-bold text-ios-text-secondary uppercase tracking-wider px-1">Destinatários</span>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'all', label: 'Todas as clientes', icon: Users },
                            { id: 'today', label: 'Agendadas hoje', icon: Megaphone },
                            { id: 'tomorrow', label: 'Agendadas amanhã', icon: Send },
                            { id: 'noshow', label: 'Cancelamentos', icon: AlertCircle },
                          ].map(seg => (
                            <button
                              key={seg.id}
                              onClick={() => setCampaignSegment(seg.id as any)}
                              className={cn(
                                "flex items-center gap-2 p-3 rounded-xl border text-left transition-all active:scale-[0.97]",
                                campaignSegment === seg.id
                                  ? "bg-ios-gold/10 border-ios-gold/30 text-ios-gold"
                                  : "bg-white/3 border-white/5 text-ios-text-secondary"
                              )}
                            >
                              <seg.icon size={14} />
                              <span className="text-[11px] font-semibold leading-tight">{seg.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Message */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-bold text-ios-text-secondary uppercase tracking-wider">Mensagem</span>
                          <span className="text-[9px] text-ios-text-secondary/50">{"{{nome}} disponível"}</span>
                        </div>
                        <textarea
                          className="w-full bg-black/20 border border-white/5 rounded-xl p-4 text-[14px] text-white/90 min-h-[100px] focus:outline-none focus:border-ios-gold/30 transition-colors leading-relaxed"
                          value={campaignMessage}
                          onChange={e => setCampaignMessage(e.target.value)}
                        />
                      </div>

                      <Button className="w-full h-12" onClick={handlePrepareCampaign}>
                        <Users size={16} />
                        Ver Destinatários
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[13px] font-bold text-white">{campaignRecipients.length} contato{campaignRecipients.length !== 1 ? 's' : ''}</span>
                        <button onClick={() => setCampaignStep('compose')} className="text-[11px] text-ios-gold font-semibold">← Voltar</button>
                      </div>
                      <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto hide-scrollbar">
                        {campaignRecipients.map((r, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5">
                            <div>
                              <p className="text-[13px] font-semibold text-white">{r.name}</p>
                              <p className="text-[10px] text-ios-text-secondary">{r.phone}</p>
                            </div>
                            <button
                              onClick={() => sendToContact(r.name, r.phone)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#25D366]/15 text-[#25D366] text-[11px] font-bold active:scale-95 transition-transform"
                            >
                              <Send size={12} />
                              Enviar
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-ios-text-secondary text-center opacity-60 leading-relaxed">
                        Toque em "Enviar" para abrir o WhatsApp com a mensagem personalizada para cada cliente.
                      </p>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tip Card */}
        <GlassCard className="p-4 bg-ios-gold/5 border border-ios-gold/10 flex items-start gap-4">
           <AlertCircle size={20} className="text-ios-gold shrink-0 mt-0.5" />
           <div className="flex flex-col gap-1">
              <p className="text-[13px] font-bold text-ios-gold tracking-tight">Otimize suas conversões</p>
               <p className="text-[12px] text-ios-text-secondary leading-snug">
                Mensagens de boas-vindas e lembretes aumentam a fidelização e reduzem faltas em até 40%.
              </p>
           </div>
        </GlassCard>
      </div>

      <AnimatePresence>
        {isPreviewOpen && (
          <Modal
            isOpen={isPreviewOpen}
            onClose={() => setIsPreviewOpen(false)}
            title="Visualização da Mensagem"
          >
             <div className="flex flex-col gap-6">
                <div className="p-6 bg-ios-cyan/5 border border-ios-cyan/10 rounded-[24px] relative">
                   <div className="absolute top-4 right-4 text-ios-cyan opacity-40">
                      <MessageCircle size={24} />
                   </div>
                   <p className="text-[15px] text-white leading-relaxed whitespace-pre-wrap italic">
                      "{previewContent}"
                   </p>
                </div>
                <div className="flex flex-col gap-2">
                   <div className="flex items-center gap-2 text-ios-text-secondary">
                      <CheckCircle2 size={16} />
                      <span className="text-[12px] font-medium">Variáveis resolvidas com sucesso</span>
                   </div>
                   <div className="flex items-center gap-2 text-ios-text-secondary">
                      <CheckCircle2 size={16} />
                      <span className="text-[12px] font-medium">Formatação iOS compatível</span>
                   </div>
                </div>
                <Button onClick={() => setIsPreviewOpen(false)} className="w-full h-14">
                   Entendido
                </Button>
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

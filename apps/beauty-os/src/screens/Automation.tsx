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
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore, AutomationTemplate } from '../lib/store';
import { resolveMessage } from '../lib/whatsapp';

export default function Automation() {
  const setActiveTab = useStore(state => state.setActiveTab);
  const templates = useStore(state => state.automationTemplates);
  const updateTemplate = useStore(state => state.updateAutomationTemplate);
  
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

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
        {templates.sort((a, b) => {
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

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard, Modal, Button, Toast, Input } from '../components/UI';
import { Logo } from '../components/Logo';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { ChevronDown, Plus, Trash2, TrendingUp, TrendingDown, X, FileUp, CheckSquare, Square, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../lib/store';
import { readStatementWithOCR, type ParsedTransaction } from '../lib/ocr';
import { getVertical } from '../lib/vertical';

export default function Financial() {
  const { transactions, addTransaction, deleteTransaction, getRevenueData, getExpenseData, getCategoryData, modalToOpen, modalData, setModalToOpen } = useStore();
  const [activeSegment, setActiveSegment] = useState<'resumo' | 'receitas' | 'despesas'>('resumo');
  const [hoverCategory, setHoverCategory] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isParsingStatement, setIsParsingStatement] = useState(false);
  const [parseMode, setParseMode] = useState<'ai' | 'ocr'>('ai');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [parsedTxs, setParsedTxs] = useState<Array<{ date: string; description: string; amount: number; type: 'revenue' | 'expense'; category: string; selected: boolean }>>([]);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const settings = useStore(state => state.settings);
  const vertical = getVertical(settings.businessType);

  useEffect(() => {
    if (modalToOpen === 'revenue' || modalToOpen === 'expense') {
      if (modalData) {
        setNewTx(prev => ({ ...prev, ...modalData, type: modalToOpen as any }));
      } else {
        setNewTx(prev => ({ ...prev, type: modalToOpen as any }));
      }
      setIsAddModalOpen(true);
      setModalToOpen(null);
    }
  }, [modalToOpen, modalData, setModalToOpen]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  
  // New Transaction Form State
  const [newTx, setNewTx] = useState({
    amount: 0,
    type: 'revenue' as 'revenue' | 'expense',
    category: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  /**
   * Plano A: Edge Function do Supabase, que fala com o Gemini.
   * A chave fica no servidor — nunca no bundle. Lança erro em qualquer
   * falha, para o chamador cair no OCR local.
   */
  const readWithAI = async (file: File): Promise<ParsedTransaction[]> => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove o prefixo "data:image/jpeg;base64," — a API quer só o payload.
        resolve(result.split(',')[1] ?? result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) throw new Error('Supabase não configurado');

    const res = await fetch(`${supabaseUrl}/functions/v1/parse-statement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ fileBase64: base64, mimeType: file.type }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);

    return (data.transactions ?? []) as ParsedTransaction[];
  };

  const handleStatementFile = async (file: File) => {
    setIsFabOpen(false);
    setIsParsingStatement(true);
    setParseMode('ai');
    setOcrProgress(0);
    try {
      let txs: ParsedTransaction[] = [];

      try {
        txs = await readWithAI(file);
      } catch (aiError) {
        // Chave expirada, sem cota ou offline: cai para o OCR local (grátis, sem chave).
        console.warn('IA indisponível, usando leitura local:', (aiError as Error).message);
        setParseMode('ocr');
        txs = await readStatementWithOCR(file, pct => setOcrProgress(pct));
      }

      if (!txs.length) {
        setToast({ message: 'Nenhuma transação encontrada. Tente uma foto mais nítida.', type: 'error' });
        return;
      }

      setParsedTxs(txs.map(t => ({ ...t, selected: true })));
      setShowImportPreview(true);
    } catch (err) {
      setToast({ message: String((err as Error).message || err), type: 'error' });
    } finally {
      setIsParsingStatement(false);
      setOcrProgress(0);
    }
  };

  const handleConfirmImport = async () => {
    const toImport = parsedTxs.filter(t => t.selected);
    if (!toImport.length) return;
    setIsImporting(true);
    try {
      for (const tx of toImport) {
        await addTransaction({ amount: tx.amount, type: tx.type, category: tx.category, date: tx.date, description: tx.description });
      }
      setToast({ message: `${toImport.length} transaç${toImport.length > 1 ? 'ões importadas' : 'ão importada'} com sucesso!`, type: 'success' });
      setShowImportPreview(false);
      setParsedTxs([]);
    } catch {
      setToast({ message: 'Erro ao importar transações', type: 'error' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleAddTransaction = async () => {
    const amount = Number(newTx.amount);
    if (!amount || !newTx.category) return;
    setIsSubmitting(true);
    try {
      await addTransaction({ ...newTx, amount });
      setIsAddModalOpen(false);
      setNewTx({
        amount: 0,
        type: activeSegment === 'despesas' ? 'expense' : 'revenue',
        category: '',
        date: new Date().toISOString().split('T')[0],
        description: ''
      });
      setToast({ message: "Transação salva com sucesso", type: 'success' });
    } catch (error) {
      console.error(error);
      setToast({ message: "Erro ao salvar transação", type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const revenueData = getRevenueData();
  const expenseData = getExpenseData();
  const pieData = getCategoryData();
  
  const totalRevenue = transactions.filter(t => t.type === 'revenue').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  const profitData = revenueData.map((d, i) => ({ value: d.value - (expenseData[i % expenseData.length]?.value || 0) }));

  return (
    <div className="flex flex-col p-6 pb-12 overflow-y-auto h-full hide-scrollbar bg-ios-bg relative">
      {/* Header */}
      <div className="mt-8 mb-6 shrink-0">
        <h1 className="text-[34px] font-bold tracking-tightest text-ios-text-primary">Financeiro</h1>
      </div>

      {/* Segmented Control */}
      <div className="mb-8 shrink-0">
        <div className="flex p-[4px] rounded-[16px] bg-ios-surface border border-ios-border h-[44px]">
          {[
            { id: 'resumo', label: 'Resumo' },
            { id: 'receitas', label: 'Receitas' },
            { id: 'despesas', label: 'Despesas' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSegment(tab.id as any)}
              className={cn(
                "flex-1 text-[15px] font-semibold rounded-[12px] transition-all relative flex items-center justify-center",
                activeSegment === tab.id ? "text-ios-gold bg-[#1E1F24]" : "text-[#8E8E93]"
              )}
            >
              {tab.label}
              {activeSegment === tab.id && (
                <motion.div 
                   layoutId="activeSubTab"
                   className="absolute bottom-[2px] left-1/2 -translate-x-1/2 w-[30%] h-[2px] bg-ios-gold rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1 group cursor-pointer active:opacity-60 transition-opacity mb-4">
        <span className="text-[20px] font-semibold text-ios-text-primary">Total Acumulado</span>
      </div>

      <div className="flex flex-col gap-5">
        <AnimatePresence mode="wait">
          {activeSegment === 'resumo' && (
            <motion.div 
              key="resumo"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col gap-5"
            >
              <GlassCard className="p-5 flex flex-col justify-between h-[160px] relative overflow-hidden border-none rounded-[22px]">
                <div className="z-10 h-full flex flex-col">
                  <span className="text-[14px] font-medium text-ios-text-secondary">Receitas Totais</span>
                  <p className="text-[28px] font-bold mt-1 text-ios-text-primary">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <span className="text-[16px] font-bold text-ios-gold mt-1">Resumo de Vendas</span>
                </div>

                <div className="absolute inset-x-0 bottom-0 h-[80px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorAccent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-ios-gold)" stopOpacity={0.2}/>
                          <stop offset="100%" stopColor="var(--color-ios-gold)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="var(--color-ios-gold)"
                        strokeWidth={3}
                        fill="url(#colorAccent)"
                        strokeLinecap="round"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              <div className="grid grid-cols-2 gap-4">
                <GlassCard className="p-4 flex flex-col justify-between h-[150px] relative overflow-hidden border-none rounded-[22px]">
                  <div className="z-10 h-full flex flex-col">
                    <span className="text-[13px] font-medium text-ios-text-secondary">Despesas</span>
                    <p className="text-[20px] font-bold mt-1 text-ios-text-primary">R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="absolute inset-x-0 bottom-4 h-[60px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={expenseData}>
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#E6C08B" 
                          strokeWidth={2.5} 
                          fill="transparent" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex flex-col justify-between h-[150px] relative overflow-hidden border-none rounded-[22px]">
                  <div className="z-10 h-full flex flex-col">
                    <span className="text-[13px] font-medium text-ios-text-secondary">Lucro líquido</span>
                    <p className="text-[20px] font-bold mt-1 text-ios-text-primary">R$ {netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="absolute inset-x-0 bottom-4 h-[60px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={profitData}>
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="var(--color-ios-gold)"
                          strokeWidth={2.5} 
                          fill="transparent" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
              </div>

              {pieData.length > 0 && (
                <div className="flex flex-col gap-6 mt-4">
                  <h3 className="text-[20px] font-bold text-ios-text-primary">Categorias de despesas</h3>
                  <div className="flex items-center gap-8">
                    <div className="w-[140px] h-[140px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            innerRadius={44}
                            outerRadius={66}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                            onMouseEnter={(_, index) => setHoverCategory(pieData[index].name)}
                            onMouseLeave={() => setHoverCategory(null)}
                          >
                            {pieData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.color} 
                                opacity={hoverCategory === null || hoverCategory === entry.name ? 1 : 0.3}
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="flex-1 flex flex-col gap-4">
                      {pieData.map((item, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-[10px] h-[10px] rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-[15px] font-medium text-[#8E8E93]">{item.name}</span>
                          </div>
                          <span className="text-[13px] font-bold text-ios-text-primary">{item.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {(activeSegment === 'receitas' || activeSegment === 'despesas') && (
            <motion.div
              key={activeSegment}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-4"
            >
              {transactions
                .filter(t => t.type === (activeSegment === 'receitas' ? 'revenue' : 'expense'))
                .map((tx) => (
                  <GlassCard key={tx.id} className="p-4 border-none rounded-[20px] flex items-center justify-between group">
                    <div className="flex flex-col gap-1">
                      <span className="text-[15px] font-bold text-ios-text-primary">{tx.category}</span>
                      <span className="text-[12px] text-ios-text-secondary">{tx.date} • {tx.description}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={cn("text-[16px] font-bold", tx.type === 'revenue' ? "text-ios-gold" : "text-red-400")}>
                        {tx.type === 'revenue' ? "+" : "-"} R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <button 
                        onClick={() => deleteTransaction(tx.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-red-500 transition-opacity"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </GlassCard>
              ))}
              {transactions.filter(t => t.type === (activeSegment === 'receitas' ? 'revenue' : 'expense')).length === 0 && (
                <div className="py-20 text-center opacity-20">
                   <p className="text-[11px] font-bold uppercase tracking-widest leading-loose">Nenhuma transação <br /> registrada</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FAB overlay */}
      {isFabOpen && (
        <div
          className="absolute inset-0 z-20"
          onClick={() => setIsFabOpen(false)}
        />
      )}

      {/* FAB Menu */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end gap-3 z-30">
        <AnimatePresence>
          {isFabOpen && (
            <>
              {[
                { label: 'Add Ganho', icon: TrendingUp, color: 'bg-emerald-500/90', action: () => { setNewTx({ ...newTx, type: 'revenue' }); setIsAddModalOpen(true); setIsFabOpen(false); } },
                { label: 'Add Gasto', icon: TrendingDown, color: 'bg-red-500/90', action: () => { setNewTx({ ...newTx, type: 'expense' }); setIsAddModalOpen(true); setIsFabOpen(false); } },
                { label: 'Importar Extrato', icon: FileUp, color: 'bg-violet-500/90', action: () => { document.getElementById('statement-file-input')?.click(); } },
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

      {/* Hidden file input for statement */}
      <input
        id="statement-file-input"
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleStatementFile(file);
          e.target.value = '';
        }}
      />

      {/* Parsing overlay */}
      <AnimatePresence>
        {isParsingStatement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center gap-6 p-8"
          >
            <div className="w-20 h-20 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <Loader2 size={36} className="text-violet-400 animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-[18px] font-bold text-white mb-1">
                {parseMode === 'ai' ? 'Lendo extrato com IA...' : 'Lendo no modo offline...'}
              </p>
              <p className="text-[13px] text-white/40">
                {parseMode === 'ai'
                  ? 'Identificando entradas e saídas'
                  : `Reconhecendo texto ${Math.round(ocrProgress * 100)}%`}
              </p>
            </div>
            {parseMode === 'ocr' && (
              <div className="w-56 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-violet-400 transition-all duration-300"
                  style={{ width: `${Math.max(4, ocrProgress * 100)}%` }}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Preview Modal */}
      <AnimatePresence>
        {showImportPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[115] bg-black/80 backdrop-blur-xl flex flex-col"
          >
            <div className="flex items-center justify-between p-6 pt-10 border-b border-white/8">
              <div>
                <h2 className="text-[18px] font-bold text-white">Extrato lido</h2>
                <p className="text-[12px] text-white/40 mt-0.5">
                  {parsedTxs.filter(t => t.selected).length} de {parsedTxs.length} selecionadas
                </p>
              </div>
              <button onClick={() => { setShowImportPreview(false); setParsedTxs([]); }} className="p-2 rounded-full bg-white/5 text-white/50">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2">
              {parsedTxs.map((tx, i) => (
                <button
                  key={i}
                  onClick={() => setParsedTxs(prev => prev.map((t, idx) => idx === i ? { ...t, selected: !t.selected } : t))}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-2xl border text-left transition-all active:scale-[0.98]",
                    tx.selected ? "bg-white/5 border-white/10" : "bg-transparent border-white/5 opacity-40"
                  )}
                >
                  <div className="shrink-0 text-white/40">
                    {tx.selected ? <CheckSquare size={18} className="text-ios-gold" /> : <Square size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-white truncate">{tx.description}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">{tx.category} · {tx.date}</p>
                  </div>
                  <span className={cn("text-[14px] font-bold shrink-0", tx.type === 'revenue' ? "text-emerald-400" : "text-red-400")}>
                    {tx.type === 'revenue' ? '+' : '-'}R$ {tx.amount.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>

            <div className="p-5 border-t border-white/8 flex gap-3">
              <Button variant="ghost" className="flex-1 h-12" onClick={() => { setShowImportPreview(false); setParsedTxs([]); }}>
                Cancelar
              </Button>
              <Button
                className="flex-1 h-12 bg-violet-500 hover:bg-violet-400 border-none"
                loading={isImporting}
                disabled={!parsedTxs.some(t => t.selected)}
                onClick={handleConfirmImport}
              >
                Importar {parsedTxs.filter(t => t.selected).length} transações
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <Modal 
            isOpen={isAddModalOpen} 
            onClose={() => setIsAddModalOpen(false)} 
            title={newTx.type === 'revenue' ? 'Nova Receita' : 'Nova Despesa'}
            footer={
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleAddTransaction} 
                  loading={isSubmitting}
                  disabled={!newTx.amount || !newTx.category}
                >
                  Salvar
                </Button>
              </div>
            }
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-ios-text-secondary uppercase px-1">Valor (R$)</label>
                <input 
                  type="number"
                  placeholder="0,00"
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                  value={newTx.amount || ''}
                  onChange={e => setNewTx({ ...newTx, amount: parseFloat(e.target.value) })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-ios-text-secondary uppercase px-1">Categoria</label>
                <Input
                  voice
                  list="tx-category-options"
                  placeholder={`Ex: ${(newTx.type === 'revenue' ? vertical.revenueCategories : vertical.expenseCategories).slice(0, 2).join(', ')}...`}
                  value={newTx.category}
                  onChange={e => setNewTx({ ...newTx, category: e.target.value })}
                />
                <datalist id="tx-category-options">
                  {(newTx.type === 'revenue' ? vertical.revenueCategories : vertical.expenseCategories).map(c => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-ios-text-secondary uppercase px-1">Descrição</label>
                <Input 
                  voice
                  placeholder="Descrição opcional"
                  value={newTx.description}
                  onChange={e => setNewTx({ ...newTx, description: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-ios-text-secondary uppercase px-1">Data</label>
                <input 
                  type="date"
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                  value={newTx.date}
                  onChange={e => setNewTx({ ...newTx, date: e.target.value })}
                />
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

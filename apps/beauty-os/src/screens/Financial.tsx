import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard, Modal, Button, Toast, Input } from '../components/UI';
import { Logo } from '../components/Logo';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../lib/store';

export default function Financial() {
  const { transactions, addTransaction, deleteTransaction, getRevenueData, getExpenseData, getCategoryData, modalToOpen, modalData, setModalToOpen } = useStore();
  const [activeSegment, setActiveSegment] = useState<'resumo' | 'receitas' | 'despesas'>('resumo');
  const [hoverCategory, setHoverCategory] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
    <div className="flex flex-col p-6 pb-12 overflow-y-auto h-full hide-scrollbar bg-[#0B0B0D] relative">
      {/* Header */}
      <div className="mt-8 mb-6 shrink-0">
        <h1 className="text-[34px] font-bold tracking-tightest text-[#F5F5F7]">Financeiro</h1>
      </div>

      {/* Segmented Control */}
      <div className="mb-8 shrink-0">
        <div className="flex p-[4px] rounded-[16px] bg-[#151518] border border-white/5 h-[44px]">
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
        <span className="text-[20px] font-semibold text-[#F5F5F7]">Total Acumulado</span>
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
              <GlassCard className="p-5 flex flex-col justify-between h-[160px] relative overflow-hidden bg-[#151518] border-none rounded-[22px]">
                <div className="z-10 h-full flex flex-col">
                  <span className="text-[14px] font-medium text-[#8E8E93]">Receitas Totais</span>
                  <p className="text-[28px] font-bold mt-1 text-[#F5F5F7]">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <span className="text-[16px] font-bold text-[#00E6FF] mt-1">SaaS Ativo</span>
                </div>
                
                <div className="absolute inset-x-0 bottom-0 h-[80px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorCyan" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00E6FF" stopOpacity={0.2}/>
                          <stop offset="100%" stopColor="#00E6FF" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#00E6FF" 
                        strokeWidth={3} 
                        fill="url(#colorCyan)"
                        strokeLinecap="round"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              <div className="grid grid-cols-2 gap-4">
                <GlassCard className="p-4 flex flex-col justify-between h-[150px] relative overflow-hidden bg-[#151518] border-none rounded-[22px]">
                  <div className="z-10 h-full flex flex-col">
                    <span className="text-[13px] font-medium text-[#8E8E93]">Despesas</span>
                    <p className="text-[20px] font-bold mt-1 text-[#F5F5F7]">R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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

                <GlassCard className="p-4 flex flex-col justify-between h-[150px] relative overflow-hidden bg-[#151518] border-none rounded-[22px]">
                  <div className="z-10 h-full flex flex-col">
                    <span className="text-[13px] font-medium text-[#8E8E93]">Lucro líquido</span>
                    <p className="text-[20px] font-bold mt-1 text-[#F5F5F7]">R$ {netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="absolute inset-x-0 bottom-4 h-[60px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={profitData}>
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#00E6FF" 
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
                  <h3 className="text-[20px] font-bold text-[#F5F5F7]">Categorias de despesas</h3>
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
                          <span className="text-[13px] font-bold text-[#F5F5F7]">{item.value}%</span>
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
                  <GlassCard key={tx.id} className="p-4 bg-[#151518] border-none rounded-[20px] flex items-center justify-between group">
                    <div className="flex flex-col gap-1">
                      <span className="text-[15px] font-bold text-white">{tx.category}</span>
                      <span className="text-[12px] text-ios-text-secondary">{tx.date} • {tx.description}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={cn("text-[16px] font-bold", tx.type === 'revenue' ? "text-[#00E6FF]" : "text-ios-gold")}>
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

      {/* FAB */}
      <button 
        onClick={() => {
          setNewTx({ ...newTx, type: activeSegment === 'despesas' ? 'expense' : 'revenue' });
          setIsAddModalOpen(true);
        }}
        className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-ios-gold flex items-center justify-center text-ios-bg shadow-[0_10px_20px_rgba(230,192,139,0.3)] active:scale-95 transition-transform z-30"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

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
                  placeholder={newTx.type === 'revenue' ? 'Ex: Microblading, Unhas...' : 'Ex: Aluguel, Produtos...'}
                  value={newTx.category}
                  onChange={e => setNewTx({ ...newTx, category: e.target.value })}
                />
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

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard, Modal, Button, Toast, Input } from '../components/UI';
import { Logo } from '../components/Logo';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { ChevronDown, Plus, Trash2, TrendingUp, TrendingDown, X, FileUp, CheckSquare, Square } from 'lucide-react';
import { cn, dataLocal } from '../lib/utils';
import { useStore } from '../lib/store';
import { type ParsedTransaction } from '../lib/ocr';
import { useImportacoes } from '../lib/importacoes';
import { getVertical } from '../lib/vertical';
import { periodo as calcularPeriodo, noPeriodo, serie, type TipoPeriodo } from '../lib/financeiro';
import { SeletorPeriodo } from '../components/financeiro/SeletorPeriodo';
import { CartaoDizimo } from '../components/financeiro/CartaoDizimo';
import { FixosParcelados } from '../components/financeiro/FixosParcelados';

export default function Financial() {
  const { transactions, addTransaction, deleteTransaction, modalToOpen, modalData, setModalToOpen } = useStore();
  // Período na tela: começa no mês atual.
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodo>('mes');
  const [referencia, setReferencia] = useState(dataLocal());
  const [activeSegment, setActiveSegment] = useState<'resumo' | 'receitas' | 'despesas'>('resumo');
  const [hoverCategory, setHoverCategory] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  // Leituras de extrato cujos lançamentos estão na revisão agora.
  const [idsEmRevisao, setIdsEmRevisao] = useState<string[]>([]);
  const revisarImportacoes = useImportacoes(state => state.revisar);
  const [parsedTxs, setParsedTxs] = useState<Array<{ date: string; description: string; amount: number; type: 'revenue' | 'expense'; category: string; selected: boolean; jaLancada: boolean }>>([]);
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
    date: dataLocal(),
    description: ''
  });

  // A leitura roda em segundo plano (src/lib/importacoes.ts). Quando a
  // pessoa toca em "Revisar", os lançamentos de todos os arquivos prontos
  // chegam aqui numa lista só.
  useEffect(() => {
    if (!revisarImportacoes) return;
    const { itens, setRevisar } = useImportacoes.getState();
    setRevisar(false);
    const prontos = itens.filter(i => i.status === 'pronto');
    if (!prontos.length) return;
    const txs: ParsedTransaction[] = prontos.flatMap(i => i.transacoes);

    // Mandar o mesmo extrato duas vezes é o erro mais fácil de cometer, e
    // nada no caminho impedia: o lançamento entrava de novo e o mês fechava
    // com o dobro. Mesma data, mesmo valor e mesma descrição já no
    // Financeiro — ou repetidos entre os arquivos — chegam desmarcados.
    const chave = (t: { date: string; amount: number; description: string }) =>
      `${t.date}|${t.amount.toFixed(2)}|${t.description.trim().toLowerCase()}`;
    const jaExiste = new Set(transactions.map(chave));
    const marcadas = txs.map(t => {
      const jaLancada = jaExiste.has(chave(t));
      jaExiste.add(chave(t));
      return { ...t, jaLancada, selected: !jaLancada };
    });

    const repetidas = marcadas.filter(t => t.jaLancada).length;
    if (repetidas) {
      setToast({
        message: repetidas === 1
          ? '1 lançamento já estava no Financeiro e veio desmarcado.'
          : `${repetidas} lançamentos já estavam no Financeiro e vieram desmarcados.`,
        type: 'success',
      });
    }
    setIdsEmRevisao(prontos.map(i => i.id));
    setParsedTxs(marcadas);
    setShowImportPreview(true);
  }, [revisarImportacoes]);

  /** Fecha a revisão; as leituras revisadas saem do painel. */
  const fecharRevisao = () => {
    setShowImportPreview(false);
    setParsedTxs([]);
    if (idsEmRevisao.length) useImportacoes.getState().descartar(idsEmRevisao);
    setIdsEmRevisao([]);
  };

  const handleConfirmImport = async () => {
    const toImport = parsedTxs.filter(t => t.selected);
    if (!toImport.length) return;
    setIsImporting(true);

    // Falhar no meio do laço deixava os anteriores gravados e dizia só "Erro
    // ao importar". Quem tentasse de novo duplicava o que já tinha entrado.
    // Agora cada lançamento é contado e os que falharam continuam na lista.
    const falharam: typeof toImport = [];
    let gravadas = 0;

    for (const tx of toImport) {
      try {
        await addTransaction({ amount: tx.amount, type: tx.type, category: tx.category, date: tx.date, description: tx.description });
        gravadas++;
      } catch {
        falharam.push(tx);
      }
    }

    setIsImporting(false);

    if (!falharam.length) {
      setToast({ message: `${gravadas} transaç${gravadas > 1 ? 'ões importadas' : 'ão importada'} com sucesso!`, type: 'success' });
      fecharRevisao();
      return;
    }

    setParsedTxs(falharam.map(t => ({ ...t, selected: true })));
    setToast({
      message: gravadas
        ? `${gravadas} importada${gravadas > 1 ? 's' : ''}, ${falharam.length} falhou. As que faltam seguem na lista.`
        : 'Nenhuma transação foi importada. Verifique a conexão e tente de novo.',
      type: 'error',
    });
  };

  const handleAddTransaction = async () => {
    const amount = Number(newTx.amount);
    // Valor negativo invertia o sentido: uma receita de -50 reduzia o
    // faturamento. O tipo já diz se é entrada ou saída.
    if (!Number.isFinite(amount) || amount <= 0) {
      setToast({ message: 'Informe um valor maior que zero.', type: 'error' });
      return;
    }
    if (!newTx.category) {
      setToast({ message: 'Escolha uma categoria.', type: 'error' });
      return;
    }
    setIsSubmitting(true);
    try {
      await addTransaction({ ...newTx, amount });
      setIsAddModalOpen(false);
      setNewTx({
        amount: 0,
        type: activeSegment === 'despesas' ? 'expense' : 'revenue',
        category: '',
        date: dataLocal(),
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

  const per = calcularPeriodo(tipoPeriodo, referencia);
  const doPeriodo = noPeriodo(transactions, per);
  const totalRevenue = doPeriodo.filter(t => t.type === 'revenue').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpenses = doPeriodo.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  // Um ponto por dia (por mês, no ano), em ordem de data. O gráfico antigo
  // ligava cada lançamento solto na ordem em que entrou: com um extrato
  // importado virava uma serra que passava por cima do texto do cartão.
  // No período de um dia só, não há linha para desenhar.
  const comGrafico = tipoPeriodo !== 'dia';
  const revenueData = serie(transactions, per, 'revenue').map(value => ({ value }));
  const expenseData = serie(transactions, per, 'expense').map(value => ({ value }));
  const profitData = serie(transactions, per, 'saldo').map(value => ({ value }));

  const CORES = ['#00E6FF', '#7B61FF', '#FF6B9D', '#FF8A5B', '#34C759', '#FFD60A'];
  const porCategoria = doPeriodo
    .filter(t => t.type === 'expense')
    .reduce<Record<string, number>>((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});
  const pieData = Object.entries(porCategoria)
    .sort((x, y) => y[1] - x[1])
    .map(([name, valor], i) => ({ name, value: Math.round((valor / totalExpenses) * 100) || 0, color: CORES[i % CORES.length] }));

  // Listas por dia, do mais recente para o mais antigo.
  const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const rotuloDoDia = (iso: string) => {
    const [ano, mes, dia] = iso.split('-').map(Number);
    return `${DIAS_SEMANA[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()]}, ${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`;
  };
  const listaPorDia = (tipo: 'revenue' | 'expense') => {
    const grupos = new Map<string, typeof doPeriodo>();
    for (const t of [...doPeriodo].filter(x => x.type === tipo).sort((x, y) => y.date.localeCompare(x.date))) {
      grupos.set(t.date, [...(grupos.get(t.date) ?? []), t]);
    }
    return [...grupos.entries()];
  };

  const apagarTransacao = async (tx: { id: string; description: string; amount: number }) => {
    if (!confirm(`Apagar "${tx.description}" de R$ ${tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}?`)) return;
    try {
      await deleteTransaction(tx.id);
      setToast({ message: 'Lançamento apagado', type: 'success' });
    } catch {
      setToast({ message: 'Não foi possível apagar. Tente de novo.', type: 'error' });
    }
  };

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

      <div className="mb-5">
        <SeletorPeriodo
          tipo={tipoPeriodo}
          referencia={referencia}
          aoMudar={(tipo, ref) => { setTipoPeriodo(tipo); setReferencia(ref); }}
        />
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
              <GlassCard className="p-5 flex flex-col overflow-hidden border-none rounded-[22px]">
                <span className="text-[14px] font-medium text-ios-text-secondary">Receitas</span>
                <p className="text-[28px] font-bold mt-1 text-ios-text-primary">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                {comGrafico && (
                  <div className="h-[64px] mt-3 -mx-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                        <defs>
                          <linearGradient id="colorAccent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-ios-gold)" stopOpacity={0.25}/>
                            <stop offset="100%" stopColor="var(--color-ios-gold)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="value" stroke="var(--color-ios-gold)" strokeWidth={2.5} fill="url(#colorAccent)" strokeLinecap="round" isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </GlassCard>

              <div className="grid grid-cols-2 gap-4">
                <GlassCard className="p-4 flex flex-col overflow-hidden border-none rounded-[22px]">
                  <span className="text-[13px] font-medium text-ios-text-secondary">Despesas</span>
                  <p className="text-[18px] font-bold mt-1 text-ios-text-primary">R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  {comGrafico && <div className="h-[44px] mt-3 -mx-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={expenseData} margin={{ top: 3, right: 3, bottom: 3, left: 3 }}>
                        <Area type="monotone" dataKey="value" stroke="#E6C08B" strokeWidth={2} fill="transparent" isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>}
                </GlassCard>

                <GlassCard className="p-4 flex flex-col overflow-hidden border-none rounded-[22px]">
                  <span className="text-[13px] font-medium text-ios-text-secondary">{vertical.hasScheduling ? 'Lucro líquido' : 'Saldo'}</span>
                  <p className={cn('text-[18px] font-bold mt-1', netProfit < 0 ? 'text-red-400' : 'text-ios-text-primary')}>R$ {netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  {comGrafico && <div className="h-[44px] mt-3 -mx-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={profitData} margin={{ top: 3, right: 3, bottom: 3, left: 3 }}>
                        <Area type="monotone" dataKey="value" stroke="var(--color-ios-gold)" strokeWidth={2} fill="transparent" isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>}
                </GlassCard>
              </div>

              <CartaoDizimo periodo={per} />
              <FixosParcelados />

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
              {listaPorDia(activeSegment === 'receitas' ? 'revenue' : 'expense').map(([dia, doDia]) => (
                <div key={dia} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[12px] font-bold uppercase tracking-wider text-ios-text-secondary">{rotuloDoDia(dia)}</span>
                    <span className="text-[12px] font-semibold text-ios-text-secondary">
                      R$ {doDia.reduce((n, t) => n + t.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {doDia.map(tx => (
                    <GlassCard key={tx.id} className="p-4 border-none rounded-[20px] flex items-center justify-between gap-3">
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-[15px] font-bold text-ios-text-primary truncate">{tx.description || tx.category}</span>
                        <span className="text-[12px] text-ios-text-secondary truncate">{tx.category}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn("text-[15px] font-bold", tx.type === 'revenue' ? "text-ios-gold" : "text-red-400")}>
                          {tx.type === 'revenue' ? "+" : "-"} R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        {/* Era opacity-0 com hover: invisível no celular, mas
                            clicável. Tocar perto do valor apagava o lançamento
                            na hora, sem confirmação e sem aviso. */}
                        <button
                          onClick={() => apagarTransacao(tx)}
                          aria-label="Apagar lançamento"
                          className="opacity-50 hover:opacity-100 p-2 text-red-500 transition-opacity"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              ))}
              {doPeriodo.filter(t => t.type === (activeSegment === 'receitas' ? 'revenue' : 'expense')).length === 0 && (
                <div className="py-20 text-center opacity-20">
                   <p className="text-[11px] font-bold uppercase tracking-widest leading-loose">Nada lançado <br /> neste período</p>
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
        multiple
        className="hidden"
        onChange={e => {
          const files: File[] = e.target.files ? Array.from<File>(e.target.files) : [];
          setIsFabOpen(false);
          if (files.length) useImportacoes.getState().enviar(files);
          e.target.value = '';
        }}
      />

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
              <button onClick={fecharRevisao} className="p-2 rounded-full bg-white/5 text-white/50">
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
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {tx.category} · {tx.date.split('-').reverse().join('/')}
                      {tx.jaLancada && <span className="text-amber-400/90"> · já lançada</span>}
                    </p>
                  </div>
                  <span className={cn("text-[14px] font-bold shrink-0", tx.type === 'revenue' ? "text-emerald-400" : "text-red-400")}>
                    {tx.type === 'revenue' ? '+' : '-'}R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </button>
              ))}
            </div>

            <div className="p-5 border-t border-white/8 flex gap-3">
              <Button variant="ghost" className="flex-1 h-12" onClick={fecharRevisao}>
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

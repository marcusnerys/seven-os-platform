import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Check, AlertCircle, Loader2, ChevronDown, X, ScanText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { cn } from '../lib/utils';
import { useImportacoes, temArquivoLocal, type Importacao } from '../lib/importacoes';

const minutos = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * Painel das leituras de extrato. Aberto, mostra cada arquivo com a etapa em
 * que está; minimizado, vira uma pílula acima da barra inferior e a pessoa
 * segue usando o app. A leitura acontece no servidor: fechar o app e voltar
 * não perde nada.
 */
export function PainelImportacao() {
  const userId = useStore(state => state.user?.id);
  const setActiveTab = useStore(state => state.setActiveTab);
  const { itens, painel, setPainel, setRevisar, carregar, descartar, lerOffline, limpar } = useImportacoes();
  const [, setTique] = React.useState(0);

  // Banco e realtime: a função grava o progresso e o resultado na linha.
  React.useEffect(() => {
    if (!userId) return;
    carregar();
    let espera: ReturnType<typeof setTimeout> | undefined;
    const canal = supabase
      .channel(`importacoes-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beautyos_importacoes', filter: `empresa_id=eq.${userId}` }, () => {
        clearTimeout(espera);
        espera = setTimeout(carregar, 300);
      })
      .subscribe();
    // Voltando ao app depois de um tempo fora, o realtime pode ter perdido
    // eventos: relê.
    const aoVoltar = () => { if (document.visibilityState === 'visible') carregar(); };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      clearTimeout(espera);
      supabase.removeChannel(canal);
      document.removeEventListener('visibilitychange', aoVoltar);
      limpar();
    };
  }, [userId]);

  const andamento = itens.filter(i => i.status === 'enviando' || i.status === 'lendo');
  const prontos = itens.filter(i => i.status === 'pronto');
  const lancamentosProntos = prontos.reduce((n, i) => n + i.transacoes.length, 0);

  // Relógio da leitura, só enquanto há alguma em andamento.
  React.useEffect(() => {
    if (!andamento.length) return;
    const t = setInterval(() => setTique(n => n + 1), 1000);
    return () => clearInterval(t);
  }, [andamento.length > 0]);

  if (!itens.length) return null;

  const revisar = () => {
    setActiveTab('financial');
    setRevisar(true);
    setPainel('minimizado');
  };

  const encontradasAgora = andamento.reduce((n, i) => n + Math.max(0, i.encontradas), 0);

  return (
    <AnimatePresence mode="wait">
      {painel === 'minimizado' ? (
        <motion.button
          key="pilula"
          type="button"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          onClick={() => (andamento.length || !prontos.length ? setPainel('aberto') : revisar())}
          className={cn(
            'fixed left-1/2 -translate-x-1/2 z-[90] bottom-[calc(env(safe-area-inset-bottom)+124px)] max-w-[calc(100vw-32px)]',
            'flex items-center gap-2.5 h-11 pl-3 pr-4 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.35)] border text-[13px] font-semibold',
            andamento.length
              ? 'bg-ios-surface border-ios-border text-ios-text-primary'
              : prontos.length
                ? 'bg-emerald-700 border-emerald-600 text-white'
                : 'bg-red-600 border-red-500 text-white'
          )}
        >
          {andamento.length ? <Loader2 size={17} className="animate-spin text-ios-gold shrink-0" />
            : prontos.length ? <Check size={17} className="shrink-0" /> : <AlertCircle size={17} className="shrink-0" />}
          <span className="truncate">
            {andamento.length
              ? `Lendo ${andamento.length} extrato${andamento.length > 1 ? 's' : ''}${encontradasAgora ? ` · ${encontradasAgora} encontrados` : ''}`
              : prontos.length
                ? `Pronto · ${lancamentosProntos} lançamentos · Revisar`
                : 'A leitura não deu certo · Ver'}
          </span>
        </motion.button>
      ) : (
        <motion.div key="painel" className="fixed inset-0 z-[95]" initial={{ opacity: 1 }} exit={{ opacity: 1 }}>
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPainel('minimizado')}
            className="absolute inset-0 bg-black/40"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Leitura de extratos"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
            className="absolute inset-x-0 bottom-0 max-h-[80dvh] flex flex-col rounded-t-[28px] bg-ios-surface border-t border-ios-border shadow-[0_-12px_40px_rgba(0,0,0,0.35)]"
          >
            <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <p className="text-[17px] font-bold text-ios-text-primary">
                  {andamento.length ? 'Lendo extratos' : prontos.length ? 'Extratos prontos' : 'Leitura de extratos'}
                </p>
                <p className="text-[13px] text-ios-text-secondary">
                  {andamento.length ? 'Pode continuar usando o app: a leitura segue sozinha.' : `${itens.length} arquivo${itens.length > 1 ? 's' : ''}`}
                </p>
              </div>
              <button
                onClick={() => setPainel('minimizado')}
                aria-label="Minimizar"
                className="w-11 h-11 rounded-full bg-ios-text-secondary/10 text-ios-text-secondary flex items-center justify-center"
              >
                <ChevronDown size={22} />
              </button>
            </div>

            <ul className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 flex flex-col gap-2.5">
              {itens.map(item => (
                <LinhaImportacao key={item.id} item={item} aoRemover={() => descartar([item.id])} aoLerOffline={() => lerOffline(item.id)} />
              ))}
            </ul>

            <div className="shrink-0 px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+20px)] flex flex-col gap-2">
              {prontos.length > 0 && (
                <button
                  type="button"
                  onClick={revisar}
                  className="h-12 rounded-2xl bg-ios-gold text-[#111214] text-[15px] font-bold"
                >
                  Revisar {lancamentosProntos} lançamento{lancamentosProntos === 1 ? '' : 's'}
                </button>
              )}
              {andamento.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPainel('minimizado')}
                  className={cn(
                    'h-12 rounded-2xl text-[15px] font-semibold',
                    prontos.length ? 'border border-ios-border text-ios-text-primary' : 'bg-ios-gold text-[#111214] font-bold'
                  )}
                >
                  Continuar usando o app
                </button>
              )}
              {!andamento.length && !prontos.length && (
                <button
                  type="button"
                  onClick={() => descartar(itens.map(i => i.id))}
                  className="h-12 rounded-2xl border border-ios-border text-ios-text-primary text-[15px] font-semibold"
                >
                  Fechar
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LinhaImportacao({ item, aoRemover, aoLerOffline }: { item: Importacao; aoRemover: () => void; aoLerOffline: () => void; key?: React.Key }) {
  const decorrido = minutos(Date.now() - item.criadoEm);
  const offline = item.offline === true;

  return (
    <li className="p-3.5 rounded-2xl bg-ios-bg border border-ios-border flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
          item.status === 'pronto' ? 'bg-emerald-700 text-white'
            : item.status === 'erro' ? 'bg-red-600 text-white'
            : 'bg-ios-gold/15 text-ios-gold'
        )}>
          {item.status === 'pronto' ? <Check size={18} /> : item.status === 'erro' ? <AlertCircle size={18} /> : <FileText size={18} />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-ios-text-primary truncate">{item.arquivo}</p>
          <p className={cn('text-[12px]', item.status === 'erro' ? 'text-red-500' : 'text-ios-text-secondary')} aria-live="polite">
            {item.status === 'enviando' && `Enviando ${Math.round(item.enviado * 100)}%`}
            {item.status === 'lendo' && (offline
              ? `Lendo sem IA ${Math.round(item.enviado * 100)}%`
              : `Lendo com IA · ${item.encontradas > 0 ? `${item.encontradas} encontrados · ` : ''}${decorrido}`)}
            {item.status === 'pronto' && `${item.transacoes.length} lançamento${item.transacoes.length === 1 ? '' : 's'} para revisar`}
            {item.status === 'erro' && item.erro}
          </p>
        </div>
        {(item.status === 'erro' || item.status === 'pronto') && (
          <button onClick={aoRemover} aria-label={`Remover ${item.arquivo}`} className="w-9 h-9 rounded-full flex items-center justify-center text-ios-text-secondary shrink-0">
            <X size={17} />
          </button>
        )}
      </div>

      {(item.status === 'enviando' || item.status === 'lendo') && (
        <div className="h-1.5 rounded-full bg-ios-text-secondary/15 overflow-hidden">
          {item.status === 'enviando' || offline ? (
            <div className="h-full bg-ios-gold transition-all duration-300" style={{ width: `${Math.max(4, item.enviado * 100)}%` }} />
          ) : (
            // Leitura com IA não tem porcentagem: faixa em movimento.
            <motion.div
              className="h-full w-1/3 rounded-full bg-ios-gold"
              animate={{ x: ['-100%', '300%'] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
            />
          )}
        </div>
      )}

      {item.status === 'erro' && item.imagem && temArquivoLocal(item.id) && (
        <button onClick={aoLerOffline} className="self-start flex items-center gap-1.5 text-[13px] font-semibold text-ios-gold py-1">
          <ScanText size={15} /> Tentar ler sem IA
        </button>
      )}
    </li>
  );
}

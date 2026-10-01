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
 * Painel das leituras de extrato: uma pílula no canto, acima da barra
 * inferior, com o progresso; tocando nela, os detalhes de cada arquivo. Nunca
 * cobre a tela — a primeira versão abria por cima de tudo com fundo escuro e
 * a pessoa não conseguia usar o app enquanto lia. A leitura acontece no
 * servidor: fechar o app e voltar não perde nada.
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
  const comErro = itens.some(i => i.status === 'erro');
  const aberto = painel === 'aberto';
  // Progresso médio do que ainda está subindo, para a faixa da pílula.
  const enviando = itens.filter(i => i.status === 'enviando');
  const envioMedio = enviando.length ? enviando.reduce((n, i) => n + i.enviado, 0) / enviando.length : 0;

  // Nada aqui cobre a tela nem bloqueia toques: a pílula fica no canto
  // esquerdo, acima da barra (os botões "+" das telas ficam à direita), e
  // os detalhes abrem num cartão por cima dela, sem fundo escurecido.
  return (
    <div className="fixed left-4 z-[90] bottom-[calc(env(safe-area-inset-bottom)+140px)] w-[min(340px,calc(100vw-104px))] flex flex-col items-start gap-2 pointer-events-none">
      <AnimatePresence>
        {aberto && (
          <motion.div
            key="detalhes"
            role="region"
            aria-label="Leitura de extratos"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-auto w-[calc(100vw-32px)] max-w-[400px] max-h-[48dvh] flex flex-col rounded-3xl bg-ios-surface border border-ios-border shadow-[0_12px_40px_rgba(0,0,0,0.45)] origin-bottom-left"
          >
            <div className="shrink-0 flex items-center justify-between pl-4 pr-2 pt-3 pb-2">
              <p className="text-[15px] font-bold text-ios-text-primary">
                {andamento.length ? 'Lendo extratos' : prontos.length ? 'Extratos prontos' : 'Leitura de extratos'}
              </p>
              <button
                onClick={() => setPainel('minimizado')}
                aria-label="Recolher"
                className="w-10 h-10 rounded-full text-ios-text-secondary flex items-center justify-center"
              >
                <ChevronDown size={20} />
              </button>
            </div>

            <ul className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 flex flex-col gap-2">
              {itens.map(item => (
                <LinhaImportacao key={item.id} item={item} aoRemover={() => descartar([item.id])} aoLerOffline={() => lerOffline(item.id)} />
              ))}
            </ul>

            <div className="shrink-0 p-3 flex gap-2">
              {prontos.length > 0 && (
                <button
                  type="button"
                  onClick={revisar}
                  className="flex-1 h-11 rounded-2xl bg-ios-gold text-[#111214] text-[14px] font-bold"
                >
                  Revisar {lancamentosProntos} lançamento{lancamentosProntos === 1 ? '' : 's'}
                </button>
              )}
              {!andamento.length && !prontos.length && (
                <button
                  type="button"
                  onClick={() => descartar(itens.map(i => i.id))}
                  className="flex-1 h-11 rounded-2xl border border-ios-border text-ios-text-primary text-[14px] font-semibold"
                >
                  Fechar
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        // Tudo pronto e sem erro: o toque já leva à revisão. Nos outros
        // casos abre e fecha os detalhes.
        onClick={() => (!andamento.length && prontos.length && !comErro ? revisar() : setPainel(aberto ? 'minimizado' : 'aberto'))}
        aria-expanded={aberto}
        className={cn(
          'pointer-events-auto relative overflow-hidden max-w-full flex items-center gap-2 h-10 pl-3 pr-3.5 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.35)] border text-[13px] font-semibold',
          andamento.length
            ? 'bg-ios-surface border-ios-border text-ios-text-primary'
            : prontos.length
              ? 'bg-emerald-700 border-emerald-600 text-white'
              : 'bg-red-600 border-red-500 text-white'
        )}
      >
        {andamento.length ? <Loader2 size={16} className="animate-spin text-ios-gold shrink-0" />
          : prontos.length ? <Check size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
        <span className="truncate">
          {enviando.length
            ? `Enviando ${Math.round(envioMedio * 100)}%`
            : andamento.length
              ? `Lendo${andamento.length > 1 ? ` ${andamento.length}` : ''}${encontradasAgora ? ` · ${encontradasAgora} encontrados` : '...'}`
              : prontos.length
                ? `${lancamentosProntos} lançamentos · Revisar`
                : 'Não deu certo · Ver'}
        </span>
        {enviando.length > 0 && (
          <span aria-hidden className="absolute left-0 bottom-0 h-[3px] bg-ios-gold transition-all duration-300" style={{ width: `${envioMedio * 100}%` }} />
        )}
      </motion.button>
    </div>
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

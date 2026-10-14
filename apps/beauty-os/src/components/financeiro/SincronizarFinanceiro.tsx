import * as React from 'react';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';
import { useRecorrentes } from '../../lib/recorrentes';

/**
 * Lê os gastos fixos e parcelados e lança o mês dos fixos assim que o app
 * abre, em qualquer tela — os totais do Início já saem com eles. Relê ao
 * voltar para o app: quem deixa o app aberto de um mês para o outro também
 * recebe o lançamento do mês novo.
 */
export function SincronizarFinanceiro() {
  const empresaId = useStore(state => state.empresaId);
  const veFinanceiro = useStore(state => state.papel === 'dono' || state.areas.includes('financeiro'));

  React.useEffect(() => {
    if (!empresaId || !veFinanceiro) return;
    const { carregar, limpar } = useRecorrentes.getState();
    carregar();
    let espera: ReturnType<typeof setTimeout> | undefined;
    const canal = supabase
      .channel(`recorrentes-${empresaId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beautyos_recorrentes', filter: `empresa_id=eq.${empresaId}` }, () => {
        clearTimeout(espera);
        espera = setTimeout(carregar, 400);
      })
      .subscribe();
    const aoVoltar = () => { if (document.visibilityState === 'visible') carregar(); };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      clearTimeout(espera);
      supabase.removeChannel(canal);
      document.removeEventListener('visibilitychange', aoVoltar);
      limpar();
    };
  }, [empresaId, veFinanceiro]);

  return null;
}

import { create } from 'zustand';
import { supabase } from './supabase';
import { useStore } from './store';
import { dataLocal } from './utils';
import { dataNoMes, mesesAGerar, parcelas } from './financeiro';

/**
 * Gastos fixos mensais e compras parceladas (migration 0019).
 *
 * Fixo: a despesa do mês é lançada quando o app abre, uma vez por mês, do
 * último mês lançado até o atual. Parcelado: todas as parcelas são lançadas
 * na criação, uma por mês. Cada lançamento leva o id do recorrente e o mês;
 * o índice único no banco impede o mesmo mês de entrar duas vezes.
 */

export interface Recorrente {
  id: string;
  tipo: 'fixo' | 'parcelado';
  descricao: string;
  valor: number;
  categoria: string;
  dia: number;
  parcelas: number | null;
  inicio: string;
  ultimoGerado: string | null;
}

type Linha = {
  id: string; tipo: 'fixo' | 'parcelado'; descricao: string; valor: number | string; categoria: string;
  dia: number; parcelas: number | null; inicio: string; ultimo_gerado: string | null;
};

const daLinha = (l: Linha): Recorrente => ({
  id: l.id, tipo: l.tipo, descricao: l.descricao, valor: Number(l.valor) || 0, categoria: l.categoria,
  dia: l.dia, parcelas: l.parcelas, inicio: l.inicio, ultimoGerado: l.ultimo_gerado,
});

const mesAtual = () => dataLocal().slice(0, 7);

type NovoRecorrente = { descricao: string; valor: number; categoria: string; dia: number; inicio: string };

type Estado = {
  itens: Recorrente[];
  carregar: () => Promise<void>;
  adicionarFixo: (novo: NovoRecorrente) => Promise<void>;
  /** `valor` é o de cada parcela. */
  adicionarParcelado: (novo: NovoRecorrente & { parcelas: number }) => Promise<void>;
  cancelar: (r: Recorrente) => Promise<void>;
  limpar: () => void;
};

export const useRecorrentes = create<Estado>((set, get) => {
  const empresa = () => {
    const id = useStore.getState().user?.id;
    if (!id) throw new Error('Entre no app de novo.');
    return id;
  };

  /** Lança os meses de cada gasto fixo que ainda faltam até o atual. */
  const gerarFixos = async (itens: Recorrente[]) => {
    const atual = mesAtual();
    for (const r of itens.filter(x => x.tipo === 'fixo')) {
      const meses = mesesAGerar(r.inicio, r.ultimoGerado, atual);
      if (!meses.length) continue;
      const { error } = await supabase.from('beautyos_transactions').upsert(
        meses.map(mes => ({
          empresa_id: empresa(),
          amount: r.valor,
          type: 'expense',
          category: r.categoria,
          date: dataNoMes(mes, r.dia),
          description: r.descricao,
          recorrente_id: r.id,
          competencia: mes,
        })),
        { onConflict: 'recorrente_id,competencia', ignoreDuplicates: true },
      );
      if (error) {
        console.error('Falha ao lançar gasto fixo:', error.message);
        continue;
      }
      const ultimo = meses[meses.length - 1];
      await supabase.from('beautyos_recorrentes').update({ ultimo_gerado: ultimo }).eq('id', r.id);
      set(s => ({ itens: s.itens.map(x => (x.id === r.id ? { ...x, ultimoGerado: ultimo } : x)) }));
    }
  };

  let gerando = false;

  return {
    itens: [],

    carregar: async () => {
      const { data, error } = await supabase.from('beautyos_recorrentes').select('*').order('criado_em');
      if (error) {
        console.error('Falha ao ler gastos fixos:', error.message);
        return;
      }
      const itens = (data as Linha[]).map(daLinha);
      set({ itens });
      // Um aparelho por vez basta; o índice único segura o resto.
      if (gerando) return;
      gerando = true;
      try { await gerarFixos(itens); } finally { gerando = false; }
    },

    adicionarFixo: async (novo) => {
      const { error } = await supabase.from('beautyos_recorrentes').insert({
        empresa_id: empresa(), tipo: 'fixo', descricao: novo.descricao, valor: novo.valor,
        categoria: novo.categoria, dia: novo.dia, inicio: novo.inicio,
      });
      if (error) throw error;
      await get().carregar();
    },

    adicionarParcelado: async (novo) => {
      const lista = parcelas(novo.descricao, novo.valor, novo.inicio, novo.dia, novo.parcelas);
      const { data, error } = await supabase.from('beautyos_recorrentes').insert({
        empresa_id: empresa(), tipo: 'parcelado', descricao: novo.descricao, valor: novo.valor,
        categoria: novo.categoria, dia: novo.dia, parcelas: novo.parcelas, inicio: novo.inicio,
        ultimo_gerado: lista[lista.length - 1].competencia,
      }).select('id').single();
      if (error) throw error;
      const { error: erroParcelas } = await supabase.from('beautyos_transactions').upsert(
        lista.map(p => ({
          empresa_id: empresa(), amount: p.amount, type: 'expense', category: novo.categoria,
          date: p.date, description: p.description, recorrente_id: data.id, competencia: p.competencia,
        })),
        { onConflict: 'recorrente_id,competencia', ignoreDuplicates: true },
      );
      if (erroParcelas) {
        // Sem as parcelas o cadastro não serve: desfaz para a pessoa tentar de novo.
        await supabase.from('beautyos_recorrentes').delete().eq('id', data.id);
        throw erroParcelas;
      }
      await get().carregar();
    },

    // Fixo: para de lançar; os meses já lançados ficam. Parcelado: as
    // parcelas dos próximos meses saem; as já vencidas ficam.
    cancelar: async (r) => {
      if (r.tipo === 'parcelado') {
        const { error } = await supabase.from('beautyos_transactions')
          .delete().eq('recorrente_id', r.id).gt('competencia', mesAtual());
        if (error) throw error;
      }
      const { error } = await supabase.from('beautyos_recorrentes').delete().eq('id', r.id);
      if (error) throw error;
      set(s => ({ itens: s.itens.filter(x => x.id !== r.id) }));
    },

    limpar: () => set({ itens: [] }),
  };
});

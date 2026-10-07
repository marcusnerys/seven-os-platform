import * as React from 'react';
import { Check, HandHeart, Settings2 } from 'lucide-react';
import { useStore } from '../../lib/store';
import { dataLocal } from '../../lib/utils';
import { dizimo, type Periodo } from '../../lib/financeiro';
import { GlassCard } from '../UI';

const reais = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Dízimo do período: o percentual das receitas (10% por padrão), quanto já
 * foi devolvido — despesas com "dízimo" na categoria ou na descrição — e
 * quanto falta, com o lançamento a um toque. Quem não dizima oculta o
 * cartão; volta em Mais → Configurações.
 */
export function CartaoDizimo({ periodo }: { periodo: Periodo }) {
  const transactions = useStore(state => state.transactions);
  const settings = useStore(state => state.settings);
  const updateSettings = useStore(state => state.updateSettings);
  const addTransaction = useStore(state => state.addTransaction);
  const setToast = useStore(state => state.setToast);
  const [ajustando, setAjustando] = React.useState(false);
  const [percentual, setPercentual] = React.useState(String(settings.dizimoPercentual ?? 10));
  const [registrando, setRegistrando] = React.useState(false);

  if (settings.dizimoAtivo === false) return null;

  const pct = settings.dizimoPercentual ?? 10;
  const { receitas, devido, devolvido, falta } = dizimo(transactions, periodo, pct);
  const progresso = devido > 0 ? Math.min(1, devolvido / devido) : 0;

  // O lançamento cai dentro do período que está na tela: o dízimo de
  // setembro registrado em outubro conta para setembro.
  const hoje = dataLocal();
  const dataDoLancamento = hoje < periodo.inicio ? periodo.inicio : hoje > periodo.fim ? periodo.fim : hoje;

  const registrar = async () => {
    setRegistrando(true);
    try {
      await addTransaction({ amount: falta, type: 'expense', category: 'Dízimo', date: dataDoLancamento, description: 'Dízimo' });
      setToast({ message: `Dízimo de ${reais(falta)} registrado.`, type: 'success' });
    } catch {
      setToast({ message: 'Não consegui registrar. Verifique a internet.', type: 'error' });
    } finally {
      setRegistrando(false);
    }
  };

  const salvarPercentual = async () => {
    const valor = Number(percentual.replace(',', '.'));
    if (!Number.isFinite(valor) || valor <= 0 || valor > 100) {
      setToast({ message: 'Informe um percentual entre 1 e 100.', type: 'error' });
      return;
    }
    await updateSettings({ dizimoPercentual: valor }).catch(() => setToast({ message: 'Não consegui salvar.', type: 'error' }));
    setAjustando(false);
  };

  return (
    <GlassCard className="p-5 border-none rounded-[22px] flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HandHeart size={18} className="text-ios-gold" />
          <span className="text-[15px] font-bold text-ios-text-primary">Dízimo</span>
          <span className="text-[12px] text-ios-text-secondary">{pct.toLocaleString('pt-BR')}% das receitas</span>
        </div>
        <button onClick={() => setAjustando(v => !v)} aria-label="Ajustar dízimo" className="w-9 h-9 -mr-2 rounded-full flex items-center justify-center text-ios-text-secondary">
          <Settings2 size={17} />
        </button>
      </div>

      {ajustando && (
        <div className="flex flex-col gap-2 p-3 rounded-2xl bg-ios-bg border border-ios-border">
          <label className="flex items-center gap-2 text-[13px] text-ios-text-secondary">
            Percentual
            <input
              value={percentual}
              onChange={e => setPercentual(e.target.value)}
              inputMode="decimal"
              className="w-20 h-10 px-3 rounded-xl bg-ios-surface border border-ios-border text-ios-text-primary text-[16px] focus:outline-none focus:border-ios-gold/50"
            />
            %
            <button onClick={salvarPercentual} className="ml-auto h-10 px-4 rounded-xl bg-ios-gold text-[#111214] text-[13px] font-bold">Salvar</button>
          </label>
          <button
            onClick={() => updateSettings({ dizimoAtivo: false }).catch(() => setToast({ message: 'Não consegui salvar.', type: 'error' }))}
            className="self-start text-[12px] text-ios-text-secondary underline underline-offset-2 py-1"
          >
            Não devolvo dízimo — ocultar este cartão
          </button>
        </div>
      )}

      {receitas === 0 ? (
        <p className="text-[14px] text-ios-text-secondary">Sem receitas neste período.</p>
      ) : (
        <>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[12px] text-ios-text-secondary">A devolver</p>
              <p className="text-[24px] font-bold text-ios-text-primary leading-tight">{reais(devido)}</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] text-ios-text-secondary">Devolvido</p>
              <p className="text-[16px] font-semibold text-ios-text-primary">{reais(devolvido)}</p>
            </div>
          </div>
          <div className="h-2 rounded-full bg-ios-text-secondary/15 overflow-hidden" role="progressbar" aria-valuenow={Math.round(progresso * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-ios-gold transition-all" style={{ width: `${progresso * 100}%` }} />
          </div>
          {falta > 0 ? (
            <button
              onClick={registrar}
              disabled={registrando}
              className="h-11 rounded-2xl bg-ios-gold text-[#111214] text-[14px] font-bold disabled:opacity-50"
            >
              {registrando ? 'Registrando...' : `Registrar dízimo de ${reais(falta)}`}
            </button>
          ) : (
            <p className="flex items-center gap-1.5 text-[14px] font-semibold text-emerald-500">
              <Check size={16} /> Dízimo deste período em dia
            </p>
          )}
        </>
      )}
    </GlassCard>
  );
}

import * as React from 'react';
import { CreditCard, Plus, Repeat, X } from 'lucide-react';
import { useStore } from '../../lib/store';
import { cn, dataLocal } from '../../lib/utils';
import { somarMeses } from '../../lib/financeiro';
import { useRecorrentes, type Recorrente } from '../../lib/recorrentes';
import { GlassCard, Modal } from '../UI';

const reais = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const mesCurto = (mes: string) => `${MESES[Number(mes.slice(5, 7)) - 1]}/${mes.slice(2, 4)}`;
const CATEGORIAS = ['Contas', 'Aluguel', 'Moradia', 'Educação', 'Saúde', 'Transporte', 'Assinaturas', 'Compras', 'Empréstimo', 'Outros'];

/** Meses entre dois AAAA-MM. */
const distancia = (de: string, ate: string) =>
  (Number(ate.slice(0, 4)) - Number(de.slice(0, 4))) * 12 + Number(ate.slice(5, 7)) - Number(de.slice(5, 7));

function situacao(r: Recorrente, mesAtual: string) {
  if (r.tipo === 'fixo') {
    return { texto: r.inicio > mesAtual ? `A partir de ${mesCurto(r.inicio)} · dia ${r.dia}` : `Todo dia ${r.dia} · ${r.categoria}`, ativo: true };
  }
  const total = r.parcelas ?? 1;
  const atual = distancia(r.inicio, mesAtual) + 1;
  const fim = somarMeses(r.inicio, total - 1);
  if (atual < 1) return { texto: `Começa em ${mesCurto(r.inicio)} · ${total}x`, ativo: true };
  if (atual > total) return { texto: `Quitado em ${mesCurto(fim)}`, ativo: false };
  return { texto: `Parcela ${atual} de ${total} · até ${mesCurto(fim)}`, ativo: true };
}

/**
 * Gastos fixos do mês (aluguel, internet, escola) e compras parceladas. O
 * app lança cada mês sozinho; aqui a pessoa vê o que já está comprometido
 * e cadastra ou cancela.
 */
export function FixosParcelados() {
  const itens = useRecorrentes(s => s.itens);
  const cancelar = useRecorrentes(s => s.cancelar);
  const setToast = useStore(s => s.setToast);
  const [novo, setNovo] = React.useState<'fixo' | 'parcelado' | null>(null);
  const mesAtual = dataLocal().slice(0, 7);

  const comSituacao = itens.map(r => ({ r, s: situacao(r, mesAtual) }));
  const porMes = comSituacao.filter(({ s }) => s.ativo).reduce((n, { r }) => n + r.valor, 0);

  const remover = async (r: Recorrente) => {
    const pergunta = r.tipo === 'fixo'
      ? `Parar de lançar "${r.descricao}" todo mês? Os meses já lançados continuam no Financeiro.`
      : `Cancelar as próximas parcelas de "${r.descricao}"? As que já venceram continuam no Financeiro.`;
    if (!window.confirm(pergunta)) return;
    try {
      await cancelar(r);
      setToast({ message: r.tipo === 'fixo' ? 'Gasto fixo removido.' : 'Parcelas futuras canceladas.', type: 'success' });
    } catch {
      setToast({ message: 'Não consegui remover. Verifique a internet.', type: 'error' });
    }
  };

  return (
    <GlassCard className="p-5 border-none rounded-[22px] flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-bold text-ios-text-primary">Fixos e parcelados</p>
          <p className="text-[12px] text-ios-text-secondary">
            {itens.length ? `${reais(porMes)} comprometidos por mês` : 'Aluguel, contas, escola, compras em parcelas'}
          </p>
        </div>
      </div>

      {comSituacao.length > 0 && (
        <ul className="flex flex-col divide-y divide-ios-border">
          {comSituacao.map(({ r, s }) => (
            <li key={r.id} className={cn('flex items-center gap-3 py-2.5', !s.ativo && 'opacity-50')}>
              <span className="w-9 h-9 rounded-xl bg-ios-gold/15 text-ios-gold flex items-center justify-center shrink-0">
                {r.tipo === 'fixo' ? <Repeat size={17} /> : <CreditCard size={17} />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-ios-text-primary truncate">{r.descricao}</p>
                <p className="text-[12px] text-ios-text-secondary truncate">{s.texto}</p>
              </div>
              <span className="text-[14px] font-semibold text-ios-text-primary shrink-0">{reais(r.valor)}</span>
              <button onClick={() => remover(r)} aria-label={`Remover ${r.descricao}`} className="w-9 h-9 -mr-2 rounded-full flex items-center justify-center text-ios-text-secondary shrink-0">
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <button onClick={() => setNovo('fixo')} className="flex-1 h-11 rounded-2xl border border-ios-border text-ios-text-primary text-[13px] font-semibold flex items-center justify-center gap-1.5">
          <Plus size={15} /> Gasto fixo
        </button>
        <button onClick={() => setNovo('parcelado')} className="flex-1 h-11 rounded-2xl border border-ios-border text-ios-text-primary text-[13px] font-semibold flex items-center justify-center gap-1.5">
          <Plus size={15} /> Compra parcelada
        </button>
      </div>

      {novo && <FormularioRecorrente tipo={novo} aoFechar={() => setNovo(null)} />}
    </GlassCard>
  );
}

function FormularioRecorrente({ tipo, aoFechar }: { tipo: 'fixo' | 'parcelado'; aoFechar: () => void }) {
  const adicionarFixo = useRecorrentes(s => s.adicionarFixo);
  const adicionarParcelado = useRecorrentes(s => s.adicionarParcelado);
  const setToast = useStore(s => s.setToast);
  const hoje = dataLocal();
  const [descricao, setDescricao] = React.useState('');
  const [valor, setValor] = React.useState('');
  const [categoria, setCategoria] = React.useState(tipo === 'fixo' ? 'Contas' : 'Compras');
  const [dia, setDia] = React.useState(String(Number(hoje.slice(8, 10))));
  const [inicio, setInicio] = React.useState(hoje.slice(0, 7));
  const [nParcelas, setNParcelas] = React.useState('10');
  const [salvando, setSalvando] = React.useState(false);

  const numero = Number(valor.replace(/\./g, '').replace(',', '.'));
  const parcelasN = Number(nParcelas);
  const diaN = Number(dia);
  const valido = descricao.trim() && Number.isFinite(numero) && numero > 0 && diaN >= 1 && diaN <= 31 && /^\d{4}-\d{2}$/.test(inicio)
    && (tipo === 'fixo' || (Number.isInteger(parcelasN) && parcelasN >= 2 && parcelasN <= 120));

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido || salvando) return;
    setSalvando(true);
    try {
      const base = { descricao: descricao.trim(), valor: Math.round(numero * 100) / 100, categoria, dia: diaN, inicio };
      if (tipo === 'fixo') await adicionarFixo(base);
      else await adicionarParcelado({ ...base, parcelas: parcelasN });
      setToast({
        message: tipo === 'fixo' ? `${base.descricao} será lançado todo dia ${diaN}.` : `${parcelasN} parcelas de ${base.descricao} lançadas.`,
        type: 'success',
      });
      aoFechar();
    } catch {
      setToast({ message: 'Não consegui salvar. Verifique a internet.', type: 'error' });
    } finally {
      setSalvando(false);
    }
  };

  const campo = 'h-12 px-4 rounded-xl bg-ios-bg border border-ios-border text-ios-text-primary text-[16px] placeholder:text-ios-text-secondary focus:outline-none focus:border-ios-gold/50 w-full';

  return (
    <Modal isOpen onClose={aoFechar} title={tipo === 'fixo' ? 'Novo gasto fixo' : 'Nova compra parcelada'}>
      <form className="flex flex-col gap-4" onSubmit={salvar}>
        <label className="flex flex-col gap-1.5 text-[13px] text-ios-text-secondary">
          {tipo === 'fixo' ? 'O que é' : 'O que foi comprado'}
          <input className={campo} value={descricao} onChange={e => setDescricao(e.target.value)} placeholder={tipo === 'fixo' ? 'Ex.: Aluguel, Internet, Escola' : 'Ex.: Geladeira, Celular'} />
        </label>
        <div className="flex gap-3">
          <label className="flex-1 flex flex-col gap-1.5 text-[13px] text-ios-text-secondary">
            {tipo === 'fixo' ? 'Valor por mês (R$)' : 'Valor de cada parcela (R$)'}
            <input className={campo} value={valor} onChange={e => setValor(e.target.value)} inputMode="decimal" placeholder="0,00" />
          </label>
          {tipo === 'parcelado' && (
            <label className="w-28 flex flex-col gap-1.5 text-[13px] text-ios-text-secondary">
              Parcelas
              <input className={campo} value={nParcelas} onChange={e => setNParcelas(e.target.value)} inputMode="numeric" />
            </label>
          )}
        </div>
        {tipo === 'parcelado' && Number.isFinite(numero) && numero > 0 && parcelasN >= 2 && (
          <p className="text-[13px] text-ios-text-secondary -mt-2">Total: {reais(numero * parcelasN)}</p>
        )}
        <div className="flex gap-3">
          <label className="w-28 flex flex-col gap-1.5 text-[13px] text-ios-text-secondary">
            Dia do mês
            <input className={campo} value={dia} onChange={e => setDia(e.target.value)} inputMode="numeric" />
          </label>
          <label className="flex-1 flex flex-col gap-1.5 text-[13px] text-ios-text-secondary">
            {tipo === 'fixo' ? 'A partir de' : 'Primeira parcela em'}
            <input className={campo} type="month" value={inicio} onChange={e => setInicio(e.target.value)} />
          </label>
        </div>
        <label className="flex flex-col gap-1.5 text-[13px] text-ios-text-secondary">
          Categoria
          <select className={campo} value={categoria} onChange={e => setCategoria(e.target.value)}>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <button type="submit" disabled={!valido || salvando} className="h-12 rounded-2xl bg-ios-gold text-[#111214] text-[15px] font-bold disabled:opacity-40">
          {salvando ? 'Salvando...' : tipo === 'fixo' ? 'Salvar gasto fixo' : `Lançar ${Number.isInteger(parcelasN) && parcelasN >= 2 ? parcelasN : ''} parcelas`}
        </button>
      </form>
    </Modal>
  );
}

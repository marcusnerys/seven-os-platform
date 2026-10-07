/**
 * Contas do Financeiro, sem tela e sem banco: períodos (dia, semana, mês,
 * ano), séries dos gráficos, meses dos gastos fixos e parcelas.
 *
 * Datas como texto AAAA-MM-DD, comparadas como texto, e contas feitas em UTC:
 * fuso e horário de verão do aparelho não mudam o dia de nada.
 */

export type TipoPeriodo = 'dia' | 'semana' | 'mes' | 'ano';

export interface Periodo {
  tipo: TipoPeriodo;
  inicio: string;
  fim: string;
  rotulo: string;
  /** Pontos do gráfico: um por dia, ou um por mês no ano. */
  pontos: string[];
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const paraData = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d || 1));
};
const paraIso = (d: Date) => d.toISOString().slice(0, 10);
const somarDias = (iso: string, n: number) => {
  const d = paraData(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return paraIso(d);
};
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const ultimoDia = (ano: number, mes: number) => new Date(Date.UTC(ano, mes, 0)).getUTCDate();

/** Período que contém o dia `ref`. A semana começa no domingo, como na Agenda. */
export function periodo(tipo: TipoPeriodo, ref: string): Periodo {
  const d = paraData(ref);
  const ano = d.getUTCFullYear();
  const mes = d.getUTCMonth() + 1;
  if (tipo === 'dia') {
    return { tipo, inicio: ref, fim: ref, rotulo: `${DIAS[d.getUTCDay()]}, ${ddmm(ref)}`, pontos: [ref] };
  }
  if (tipo === 'semana') {
    const inicio = somarDias(ref, -d.getUTCDay());
    const fim = somarDias(inicio, 6);
    return { tipo, inicio, fim, rotulo: `${ddmm(inicio)} – ${ddmm(fim)}`, pontos: Array.from({ length: 7 }, (_, i) => somarDias(inicio, i)) };
  }
  if (tipo === 'mes') {
    const mm = String(mes).padStart(2, '0');
    const n = ultimoDia(ano, mes);
    return {
      tipo,
      inicio: `${ano}-${mm}-01`,
      fim: `${ano}-${mm}-${String(n).padStart(2, '0')}`,
      rotulo: `${MESES[mes - 1]} ${ano}`,
      pontos: Array.from({ length: n }, (_, i) => `${ano}-${mm}-${String(i + 1).padStart(2, '0')}`),
    };
  }
  return {
    tipo,
    inicio: `${ano}-01-01`,
    fim: `${ano}-12-31`,
    rotulo: String(ano),
    pontos: Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, '0')}`),
  };
}

/** Dia de referência do período anterior (-1) ou seguinte (+1). */
export function moverPeriodo(tipo: TipoPeriodo, ref: string, passo: 1 | -1): string {
  if (tipo === 'dia') return somarDias(ref, passo);
  if (tipo === 'semana') return somarDias(ref, 7 * passo);
  const d = paraData(ref);
  if (tipo === 'mes') return paraIso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + passo, 1)));
  return `${d.getUTCFullYear() + passo}-01-01`;
}

type Lancamento = { date: string; amount: number; type: 'revenue' | 'expense' };

export const noPeriodo = <T extends { date: string }>(lista: T[], p: Periodo) =>
  lista.filter(t => t.date >= p.inicio && t.date <= p.fim);

/**
 * Total por ponto do período, na ordem das datas. O gráfico antigo desenhava
 * cada lançamento solto, na ordem em que entraram: um extrato importado
 * virava uma serra sem sentido que passava por cima do texto do cartão.
 */
export function serie(lista: Lancamento[], p: Periodo, qual: 'revenue' | 'expense' | 'saldo'): number[] {
  const porPonto = new Map(p.pontos.map(k => [k, 0]));
  for (const t of noPeriodo(lista, p)) {
    const chave = p.tipo === 'ano' ? t.date.slice(0, 7) : t.date;
    if (!porPonto.has(chave)) continue;
    const valor = qual === 'saldo' ? (t.type === 'revenue' ? t.amount : -t.amount) : t.type === qual ? t.amount : 0;
    porPonto.set(chave, porPonto.get(chave)! + valor);
  }
  return p.pontos.map(k => Math.round(porPonto.get(k)! * 100) / 100);
}

// ─── Gastos fixos e parcelados ──────────────────────────────────────────

/** "2026-10" + n meses. */
export function somarMeses(mes: string, n: number): string {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

/** Dia do vencimento naquele mês; dia 31 em fevereiro vira o último dia. */
export function dataNoMes(mes: string, dia: number): string {
  const [a, m] = mes.split('-').map(Number);
  return `${mes}-${String(Math.min(dia, ultimoDia(a, m))).padStart(2, '0')}`;
}

/**
 * Meses de um gasto fixo que ainda faltam lançar, até o mês atual: do
 * seguinte ao último lançado, ou do início. Lançado o mês inteiro de uma
 * vez, o mês mostra o compromisso todo desde o dia 1.
 */
export function mesesAGerar(inicio: string, ultimoGerado: string | null, mesAtual: string): string[] {
  const meses: string[] = [];
  let mes = ultimoGerado && ultimoGerado >= inicio ? somarMeses(ultimoGerado, 1) : inicio;
  while (mes <= mesAtual && meses.length < 240) {
    meses.push(mes);
    mes = somarMeses(mes, 1);
  }
  return meses;
}

/** Parcelas de uma compra: uma por mês a partir do início. */
export function parcelas(descricao: string, valor: number, inicio: string, dia: number, total: number) {
  return Array.from({ length: total }, (_, i) => {
    const mes = somarMeses(inicio, i);
    return { competencia: mes, date: dataNoMes(mes, dia), description: `${descricao} (${i + 1}/${total})`, amount: valor };
  });
}

/** Valor de cada parcela a partir do total, com os centavos que sobram na primeira. */
export function valorDasParcelas(total: number, n: number): number[] {
  const centavos = Math.round(total * 100);
  const base = Math.floor(centavos / n);
  return Array.from({ length: n }, (_, i) => (base + (i === 0 ? centavos - base * n : 0)) / 100);
}

// ─── Dízimo ─────────────────────────────────────────────────────────────

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Despesa que é dízimo: pela categoria ou pela descrição. */
export const ehDizimo = (t: { category: string; description: string; type: string }) =>
  t.type === 'expense' && (semAcento(t.category).includes('dizimo') || semAcento(t.description).includes('dizimo'));

/** Quanto devolver no período, quanto já foi e quanto falta. */
export function dizimo(lista: Array<{ date: string; amount: number; type: 'revenue' | 'expense'; category: string; description: string }>, p: Periodo, percentual: number) {
  const doPeriodo = noPeriodo(lista, p);
  const receitas = doPeriodo.filter(t => t.type === 'revenue').reduce((n, t) => n + t.amount, 0);
  const devido = Math.round(receitas * percentual) / 100;
  const devolvido = Math.round(doPeriodo.filter(ehDizimo).reduce((n, t) => n + t.amount, 0) * 100) / 100;
  return { receitas, devido, devolvido, falta: Math.max(0, Math.round((devido - devolvido) * 100) / 100) };
}

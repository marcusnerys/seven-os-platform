export type Tx = { amount: number | string; type: 'revenue' | 'expense'; category: string | null; date: string };
export type Cli = { id: string; name: string | null; last_visit: string | null; phone?: string | null };
export type Ag = {
  id: string;
  client_id: string | null;
  client_name: string | null;
  service: string | null;
  date: string;
  time: string | null;
  status: string;
  client_phone?: string | null;
};
export type Segmento = 'inativas' | 'hoje' | 'amanha' | 'todas';

const DIA_MS = 86_400_000;
const MAX_DIAS_PERIODO = 366;
const DIAS_INATIVA_PADRAO = 60;
const TOP_CATEGORIAS = 8;
const STATUS_FUTURO_ATIVO = new Set(['Confirmado', 'Pendente']);

const fmtDataSP = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
});
const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function hojeSaoPaulo(now: Date = new Date()): string {
  const p = Object.fromEntries(fmtDataSP.formatToParts(now).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

function paraUTC(iso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [a, m, d] = iso.split('-').map(Number);
  const t = Date.UTC(a, m - 1, d);
  return new Date(t).toISOString().slice(0, 10) === iso ? t : null;
}

function deUTC(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

function somarDias(iso: string, n: number): string {
  return deUTC((paraUTC(iso) ?? NaN) + n * DIA_MS);
}

function diasEntre(de: string, ate: string): number {
  return Math.round(((paraUTC(ate) ?? NaN) - (paraUTC(de) ?? NaN)) / DIA_MS);
}

const soData = (s: string | null | undefined) => (s ?? '').slice(0, 10);
const noPeriodo = (data: string, inicio: string, fim: string) => data >= inicio && data <= fim;

export function validarPeriodo(inicio: string, fim: string): { inicio: string; fim: string } {
  const i = paraUTC(inicio);
  const f = paraUTC(fim);
  if (i === null || f === null) throw new Error('Datas inválidas. Use o formato AAAA-MM-DD.');
  if (i > f) throw new Error('A data inicial precisa ser anterior ou igual à final.');
  if ((f - i) / DIA_MS + 1 > MAX_DIAS_PERIODO) throw new Error('O período pode ter no máximo 366 dias.');
  return { inicio, fim };
}

export function periodoAnterior(inicio: string, fim: string): { inicio: string; fim: string } {
  const dias = diasEntre(inicio, fim) + 1;
  return { inicio: somarDias(inicio, -dias), fim: somarDias(inicio, -1) };
}

export function resumoFinanceiro(txs: Tx[], inicio: string, fim: string) {
  const centavos = { revenue: 0, expense: 0 };
  const categorias = new Map<string, { categoria: string; tipo: 'receita' | 'despesa'; centavos: number }>();
  let quantidade = 0;
  for (const t of txs) {
    const valor = Math.round(Number(t.amount) * 100);
    const tipoValido = t.type === 'revenue' || t.type === 'expense';
    if (!Number.isFinite(valor) || !tipoValido || !noPeriodo(soData(t.date), inicio, fim)) continue;
    quantidade++;
    centavos[t.type] += valor;
    const tipo = t.type === 'revenue' ? 'receita' : 'despesa';
    const categoria = limparTexto(t.category, 40) || 'Sem categoria';
    const chave = `${tipo}|${categoria}`;
    const atual = categorias.get(chave) ?? { categoria, tipo, centavos: 0 };
    categorias.set(chave, { ...atual, centavos: atual.centavos + valor });
  }
  const porCategoria = [...categorias.values()]
    .sort((a, b) => b.centavos - a.centavos)
    .slice(0, TOP_CATEGORIAS)
    .map(({ categoria, tipo, centavos: c }) => ({ categoria, tipo, total: c / 100 }));
  return {
    inicio,
    fim,
    receita: centavos.revenue / 100,
    despesa: centavos.expense / 100,
    resultado: (centavos.revenue - centavos.expense) / 100,
    quantidade,
    porCategoria,
  };
}

export function chaveTelefone(tel: string | null | undefined): string {
  const d = String(tel ?? '').replace(/\D/g, '');
  const local = (d.length === 12 || d.length === 13) && d.startsWith('55') ? d.slice(2) : d;
  return local.length >= 10 ? local : '';
}

// Agendamento do link público chega com client_id nulo: casa pelo telefone com o cadastro.
function idsAgendados(agendamentos: Ag[], clientes: Cli[], incluir: (a: Ag) => boolean): Set<string> {
  const porTelefone = new Map<string, string[]>();
  for (const c of clientes) {
    const chave = chaveTelefone(c.phone);
    if (chave) porTelefone.set(chave, [...(porTelefone.get(chave) ?? []), c.id]);
  }
  return new Set(agendamentos.filter(incluir).flatMap((a) =>
    a.client_id ? [a.client_id] : porTelefone.get(chaveTelefone(a.client_phone)) ?? []));
}

function clientesComHorarioFuturo(agendamentos: Ag[], clientes: Cli[], hoje: string): Set<string> {
  return idsAgendados(agendamentos, clientes, (a) => soData(a.date) >= hoje && STATUS_FUTURO_ATIVO.has(a.status));
}

function limitarDias(dias: number): number {
  return Number.isFinite(dias) ? Math.min(730, Math.max(1, Math.round(dias))) : DIAS_INATIVA_PADRAO;
}

export function clientesInativas(clientes: Cli[], agendamentos: Ag[], dias: number, hoje: string, limite = 20) {
  const d = limitarDias(dias);
  const comHorario = clientesComHorarioFuturo(agendamentos, clientes, hoje);
  let semVisitaRegistrada = 0;
  const inativas: { id: string; nome: string; ultimaVisita: string; diasSemVisita: number }[] = [];
  for (const c of clientes) {
    if (comHorario.has(c.id)) continue;
    const ultimaVisita = soData(c.last_visit);
    if (paraUTC(ultimaVisita) === null) {
      semVisitaRegistrada++;
      continue;
    }
    const diasSemVisita = diasEntre(ultimaVisita, hoje);
    if (diasSemVisita > d) inativas.push({ id: c.id, nome: limparTexto(c.name) || 'Sem nome', ultimaVisita, diasSemVisita });
  }
  inativas.sort((a, b) => b.diasSemVisita - a.diasSemVisita);
  return { dias: d, total: inativas.length, semVisitaRegistrada, clientes: inativas.slice(0, limite) };
}

export function resumoAgenda(ags: Ag[], inicio: string, fim: string, limite = 40) {
  const periodo = ags
    .filter((a) => noPeriodo(soData(a.date), inicio, fim))
    .map((a) => ({
      data: soData(a.date),
      hora: limparTexto(a.time, 5),
      cliente: limparTexto(a.client_name) || 'Sem nome',
      servico: limparTexto(a.service),
      status: limparTexto(a.status, 20),
    }))
    .sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));
  const porStatus: Record<string, number> = {};
  for (const a of periodo) porStatus[a.status] = (porStatus[a.status] ?? 0) + 1;
  return { inicio, fim, total: periodo.length, porStatus, itens: periodo.slice(0, limite) };
}

function clientesAgendadasEm(agendamentos: Ag[], clientes: Cli[], data: string): Set<string> {
  return idsAgendados(agendamentos, clientes, (a) => soData(a.date) === data && a.status !== 'Cancelado');
}

export function segmentoCampanha(
  segmento: Segmento,
  dados: { clientes: Cli[]; agendamentos: Ag[]; hoje: string; dias?: number },
): string[] {
  const { clientes, agendamentos, hoje } = dados;
  let ids: string[];
  if (segmento === 'todas') ids = clientes.map((c) => c.id);
  else if (segmento === 'inativas') {
    ids = clientesInativas(clientes, agendamentos, dados.dias ?? DIAS_INATIVA_PADRAO, hoje, Infinity).clientes.map((c) => c.id);
  } else if (segmento === 'hoje' || segmento === 'amanha') {
    const agendadas = clientesAgendadasEm(agendamentos, clientes, segmento === 'hoje' ? hoje : somarDias(hoje, 1));
    ids = clientes.filter((c) => agendadas.has(c.id)).map((c) => c.id);
  } else throw new Error('Segmento de campanha inválido.');
  const comTelefone = new Set(clientes.filter((c) => (c.phone ?? '').trim()).map((c) => c.id));
  return [...new Set(ids)].filter((id) => comTelefone.has(id));
}

const RE_LINK = /(?:https?:\/\/|www\.)\S+|[\p{L}\d-]+(?:\.[\p{L}\d-]+)*\.(?:com|net|org|br|ly|me|io|app|link|site|shop|store|info|xyz|co|gl|gg|to)\b\S*/giu;
const RE_TELEFONE = /\+?\d[\d\s().-]{6,}\d/g;
const RE_DATA_ISO = /\d{4}-\d{2}-\d{2}/g;

const palavrasDe = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
const normalizarLink = (l: string) =>
  l.toLowerCase().replace(/[.,;:!?)\]]+$/, '').replace(/^https?:\/\//, '').replace(/^www\./, '');
const telefonesDe = (s: string) => (s.replace(RE_DATA_ISO, ' ').match(RE_TELEFONE) ?? [])
  .map((t) => t.replace(/\D/g, '')).filter((d) => d.length >= 8);

// A mesma mensagem vai para várias pessoas, e o modelo leu texto vindo do agendamento público.
export function problemaNaCampanha(mensagem: string, nomesClientes: (string | null)[], textoDoDono: string): string | null {
  const dono = textoDoDono.toLowerCase();
  const telefonesDoDono = telefonesDe(textoDoDono);
  const linkNovo = (mensagem.match(RE_LINK) ?? []).some((l) => !dono.includes(normalizarLink(l)));
  const telefoneNovo = telefonesDe(mensagem).some((d) => !telefonesDoDono.some((x) => x.includes(d) || d.includes(x)));
  if (linkNovo || telefoneNovo) return 'A mensagem não pode ter links nem telefones que a pessoa não passou na conversa.';
  const doDono = new Set(palavrasDe(textoDoDono));
  const nomes = new Set(nomesClientes.map((n) => palavrasDe(n ?? '')[0] ?? '').filter((n) => n.length >= 3 && !doDono.has(n)));
  if (palavrasDe(mensagem.replace(/\{\{\w+\}\}/g, ' ')).some((p) => nomes.has(p))) {
    return 'A mensagem vai para várias pessoas: não escreva nomes de clientes, use {{nome}}.';
  }
  return null;
}

// Texto do banco pode ter vindo do agendamento público: tira o que permite fechar/abrir delimitadores do prompt.
export function limparTexto(s: string | null | undefined, max = 60): string {
  const limpo = String(s ?? '')
    .replace(/\p{Cc}/gu, ' ')
    .replace(/\p{Cf}/gu, '')
    .replace(/[<>＜＞]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return [...limpo].slice(0, max).join('').trimEnd();
}

export function formatarBRL(n: number): string {
  return fmtBRL.format(Number.isFinite(n) ? n : 0);
}

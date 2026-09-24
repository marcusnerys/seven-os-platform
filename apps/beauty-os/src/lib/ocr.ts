/**
 * Leitura de extratos sem IA paga.
 *
 * Tesseract roda 100% no navegador (WASM), sem chave de API e sem limite de uso.
 * É o plano B quando a IA falha ou a chave expira.
 *
 * Limitação conhecida: lê texto impresso bem, manuscrito mal.
 */

import { dataLocal } from './utils';

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'revenue' | 'expense';
  category: string;
}

const REVENUE_HINTS = [
  'entrada', 'recebi', 'recebido', 'receita', 'venda', 'vendi', 'credito', 'crédito',
  'deposito', 'depósito', 'salario', 'salário', 'pix recebido', 'transferencia recebida',
  'rendimento', 'estorno',
];

const EXPENSE_HINTS = [
  'saida', 'saída', 'paguei', 'pagamento', 'compra', 'comprei', 'debito', 'débito',
  'despesa', 'gasto', 'saque', 'boleto', 'tarifa', 'fatura', 'aluguel', 'conta',
];

const CATEGORY_HINTS: Array<[string, string[]]> = [
  ['Alimentação', ['mercado', 'supermercado', 'padaria', 'restaurante', 'lanche', 'ifood', 'almoco', 'almoço', 'comida']],
  ['Transporte', ['uber', 'combustivel', 'combustível', 'gasolina', 'posto', 'onibus', 'ônibus', 'estacionamento', 'pedagio', 'pedágio']],
  ['Moradia', ['aluguel', 'condominio', 'condomínio', 'luz', 'energia', 'agua', 'água', 'internet', 'gas', 'gás']],
  ['Saúde', ['farmacia', 'farmácia', 'medico', 'médico', 'consulta', 'exame', 'plano de saude']],
  ['Produtos', ['produto', 'material', 'fornecedor', 'estoque', 'peca', 'peça', 'peças', 'pecas']],
  ['Marketing', ['anuncio', 'anúncio', 'ads', 'marketing', 'impulsionamento', 'publicidade']],
  ['Impostos', ['imposto', 'das', 'simples nacional', 'inss', 'darf', 'tributo']],
  ['Serviço', ['servico', 'serviço', 'mao de obra', 'mão de obra', 'corte', 'manutencao', 'manutenção', 'revisao', 'revisão']],
];

/** Converte "1.234,56", "1234,56", "1234.56" ou "1234" em número. */
function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[R$\s]/gi, '');
  if (!cleaned) return null;

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  let normalized: string;
  if (hasComma && hasDot) {
    // 1.234,56 — ponto é separador de milhar
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    normalized = cleaned.replace(',', '.');
  } else if (hasDot && /^\d{1,3}(?:\.\d{3})+$/.test(cleaned)) {
    // "1.500" e "12.499" são mil e quinhentos e doze mil, não 1,5 e 12,499.
    // Extrato brasileiro escreve valor redondo sem centavos desse jeito, e
    // lê-lo como decimal erra o lançamento por um fator de mil.
    normalized = cleaned.replace(/\./g, '');
  } else {
    normalized = cleaned;
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

const LINHA_DE_RESUMO = /^\s*(saldo|sdo|subtotal|total|limite)\b/i;

/** Soma dias a uma data ISO, sem depender do fuso do aparelho. */
function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * Onde está o valor monetário da linha: só os dígitos, sem sinal nem "R$".
 * Prioriza formatos com centavos; inteiro simples só vale depois de "R$".
 *
 * Sem lookbehind de propósito: o Safari só suporta a partir do iOS 16.4, e
 * num iPhone mais antigo a expressão lançava SyntaxError e derrubava a
 * leitura inteira do extrato.
 */
function acharValor(rest: string): { texto: string; inicio: number } | null {
  const padroes = [
    /\d{1,3}(?:\.\d{3})+,\d{2}/,
    /\d+,\d{2}/,
    // Milhar sem centavos ("R$ 1.500"). Precisa vir antes do inteiro
    // simples, senão aquele casa só o "1" e descarta o ".500".
    /\d{1,3}(?:\.\d{3})+(?!\d)/,
    /\d+\.\d{2}\b/,
  ];
  for (const re of padroes) {
    const m = rest.match(re);
    if (m && m.index !== undefined) return { texto: m[0], inicio: m.index };
  }
  const inteiro = rest.match(/R\$\s*-?(\d+)(?!\d)/);
  if (inteiro && inteiro.index !== undefined) {
    return { texto: inteiro[1], inicio: inteiro.index + inteiro[0].length - inteiro[1].length };
  }
  return null;
}

const TIPOS_RECEITA = ['revenue', 'receita', 'entrada', 'credito', 'crédito', 'income'];
const TIPOS_DESPESA = ['expense', 'despesa', 'saida', 'saída', 'debito', 'débito'];

/** Rejeita data que não existe no calendário: 31/02, 00/08, ano truncado. */
function ehDataReal(iso: string): boolean {
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

/** Extrai uma data da linha e devolve ISO + a linha sem a data. */
function extractDate(line: string, fallbackISO: string): { iso: string; rest: string } {
  // 2026-08-27
  const isoMatch = line.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    return { iso: isoMatch[0], rest: line.replace(isoMatch[0], ' ') };
  }

  // 27/08/2026, 27.08.2026, 27-08-26 — três partes, separador repetido.
  // Depois 27/08 e 27-08 — duas partes, sem ponto. O ponto de duas partes é
  // ambíguo com valor monetário e o Tesseract troca vírgula por ponto o tempo
  // todo: "R$ 8,10" chegava como "8.10", virava dia 8 do mês 10, o valor
  // sumia da linha e o lançamento era descartado sem aviso.
  const brMatch =
    line.match(/\b(\d{1,2})([/.\-])(\d{1,2})\2(\d{4}|\d{2})\b/) ||
    line.match(/\b(\d{1,2})([/\-])(\d{1,2})\b/);

  if (brMatch) {
    const [trecho, dia, , mes, ano] = brMatch;
    const year = ano === undefined
      ? fallbackISO.slice(0, 4)
      : ano.length === 2 ? `20${ano}` : ano;

    let iso = `${year}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    // Sem ano no extrato, uma data muito à frente de hoje é do ano anterior:
    // "28/12" lido em janeiro virava dezembro do ano seguinte. Só a partir de
    // dois meses — lançamento agendado para daqui a dias ("PIX AGENDADO
    // 25/09") fica no ano corrente.
    if (ano === undefined && iso > somarDias(fallbackISO, 60)) {
      iso = `${Number(year) - 1}${iso.slice(4)}`;
    }
    if (ehDataReal(iso)) {
      return { iso, rest: line.replace(trecho, ' ') };
    }
  }

  return { iso: fallbackISO, rest: line };
}

function detectType(line: string, signedNegative: boolean): 'revenue' | 'expense' {
  if (signedNegative) return 'expense';
  const lower = line.toLowerCase();
  if (REVENUE_HINTS.some(h => lower.includes(h))) return 'revenue';
  if (EXPENSE_HINTS.some(h => lower.includes(h))) return 'expense';
  return 'expense';
}

function detectCategory(description: string, type: 'revenue' | 'expense'): string {
  const lower = description.toLowerCase();
  for (const [category, hints] of CATEGORY_HINTS) {
    if (hints.some(h => lower.includes(h))) return category;
  }
  return type === 'revenue' ? 'Outros' : 'Outros';
}

/**
 * Transforma texto bruto de OCR em transações.
 * Cada linha que contiver um valor monetário vira uma transação.
 */
export function parseStatementText(text: string, todayISO: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length < 3) continue;

    const { iso, rest } = extractDate(line, todayISO);

    // Saldo, total e limite descrevem a conta, não movimentam dinheiro. Todo
    // extrato tem "SALDO ANTERIOR 1.234,56"; sem esta regra a linha entrava
    // como despesa já marcada para importar. Só quando a palavra abre a
    // linha: no meio da descrição são lançamentos reais ("TRANSF SALDO
    // C/SAL", "POSTO TOTAL", "JUROS LIMITE DA CONTA").
    if (LINHA_DE_RESUMO.test(rest)) continue;

    // Só o número; sinal e "R$" são lidos à parte. O padrão antigo aceitava
    // um "R" solto antes dos dígitos e comia a última letra da descrição
    // ("FORNECEDOR 50,00" virava "FORNECEDO"), e tratava qualquer hífen
    // antes do valor como sinal, então "Venda - R$ 50,00" virava despesa.
    const nucleo = acharValor(rest);
    if (!nucleo) continue;

    const amount = parseAmount(nucleo.texto);
    if (amount === null || amount === 0) continue;

    const antes = rest.slice(0, nucleo.inicio);
    const depois = rest.slice(nucleo.inicio + nucleo.texto.length);
    // Sinal só quando colado: "-2.000,00", "-R$ 50,00", "R$ -50,00".
    // Hífen seguido de espaço é separador de descrição.
    const isNegative = /(?:^|\s)-(?:R\$\s*)?$/.test(antes) || /R\$\s*-$/.test(antes);

    const description = `${antes.replace(/\s*[-+]?\s*(?:R\$)?\s*-?\s*$/, '')} ${depois}`
      .replace(/\s{2,}/g, ' ')
      .replace(/^[\s\-–—.:|]+|[\s\-–—.:|]+$/g, '')
      .trim();

    if (!description) continue;

    const type = detectType(line, isNegative);

    transactions.push({
      date: iso,
      description: description.slice(0, 120),
      amount: Math.abs(amount),
      type,
      category: detectCategory(description, type),
    });
  }

  return transactions;
}

/**
 * Confere a resposta da IA antes de ela chegar à tela de revisão.
 *
 * O JSON do Gemini ia direto para a importação. Valor vindo como texto
 * ("250,00") virava NaN e a gravação falhava; negativo aparecia com sinal
 * trocado; tipo "saida" ou data "31/02/2026" iam para o banco e eram
 * recusados. Aqui cada item é normalizado ou descartado.
 */
export function sanitizarTransacoes(raw: unknown, todayISO: string): ParsedTransaction[] {
  if (!Array.isArray(raw)) return [];

  const saida: ParsedTransaction[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;

    const valor = typeof r.amount === 'number' ? r.amount : parseAmount(String(r.amount ?? ''));
    if (valor === null || !Number.isFinite(valor) || valor === 0) continue;

    const description = String(r.description ?? '').trim().slice(0, 120);
    if (!description) continue;

    const tipoBruto = String(r.type ?? '').trim().toLowerCase();
    const type: 'revenue' | 'expense' =
      TIPOS_RECEITA.includes(tipoBruto) ? 'revenue'
      : TIPOS_DESPESA.includes(tipoBruto) ? 'expense'
      : detectType(description, valor < 0);

    const dataBruta = typeof r.date === 'string' ? r.date.trim() : '';
    const date = /^\d{4}-\d{2}-\d{2}$/.test(dataBruta) && ehDataReal(dataBruta) ? dataBruta : todayISO;

    const category = String(r.category ?? '').trim().slice(0, 60) || detectCategory(description, type);

    saida.push({ date, description, amount: Math.abs(valor), type, category });
  }
  return saida;
}

/**
 * Roda OCR na imagem e devolve as transações encontradas.
 * `onProgress` recebe 0–1 para alimentar a barra de progresso.
 */
export async function readStatementWithOCR(
  file: File,
  onProgress?: (pct: number) => void
): Promise<ParsedTransaction[]> {
  if (file.type === 'application/pdf') {
    throw new Error('O modo offline lê apenas fotos. Tire uma foto do extrato.');
  }

  // Import dinâmico: o WASM (~2MB) só baixa quando o plano B é acionado.
  const Tesseract = (await import('tesseract.js')).default;

  const { data } = await Tesseract.recognize(file, 'por', {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(m.progress);
    },
  });

  const todayISO = dataLocal();
  return parseStatementText(data.text ?? '', todayISO);
}

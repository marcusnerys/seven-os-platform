/**
 * Leitura de extratos sem IA paga.
 *
 * Tesseract roda 100% no navegador (WASM), sem chave de API e sem limite de uso.
 * É o plano B quando a IA falha ou a chave expira.
 *
 * Limitação conhecida: lê texto impresso bem, manuscrito mal.
 */

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
  } else {
    normalized = cleaned;
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Extrai uma data da linha e devolve ISO + a linha sem a data. */
function extractDate(line: string, fallbackISO: string): { iso: string; rest: string } {
  // 2026-08-27
  const isoMatch = line.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    return { iso: isoMatch[0], rest: line.replace(isoMatch[0], ' ') };
  }

  // 27/08/2026, 27/08/26, 27/08, 27-08
  const brMatch = line.match(/\b(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?\b/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    if (Number(month) >= 1 && Number(month) <= 12 && Number(day) >= 1 && Number(day) <= 31) {
      let year = brMatch[3] ?? fallbackISO.slice(0, 4);
      if (year.length === 2) year = `20${year}`;
      return { iso: `${year}-${month}-${day}`, rest: line.replace(brMatch[0], ' ') };
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

    // Valor monetário: prioriza formatos com centavos, aceita inteiro com R$
    const moneyMatch =
      rest.match(/([+-]?\s*R?\$?\s*\d{1,3}(?:\.\d{3})+,\d{2})/) ||
      rest.match(/([+-]?\s*R?\$?\s*\d+,\d{2})/) ||
      rest.match(/([+-]?\s*R?\$?\s*\d+\.\d{2})\b/) ||
      rest.match(/([+-]?\s*R\$\s*\d+)/);

    if (!moneyMatch) continue;

    const token = moneyMatch[1];
    const isNegative = /^\s*-/.test(token);
    const amount = parseAmount(token.replace(/^[+-]/, ''));
    if (amount === null || amount === 0) continue;

    const description = rest
      .replace(token, ' ')
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

  const todayISO = new Date().toISOString().split('T')[0];
  return parseStatementText(data.text ?? '', todayISO);
}

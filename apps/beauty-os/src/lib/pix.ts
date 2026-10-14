/**
 * PIX "copia e cola" (BR Code estático, padrão EMV do Banco Central).
 *
 * Sem banco nem gateway: o código leva a chave PIX do negócio e o valor, e o
 * cliente cola no app do banco dele. A confirmação do pagamento continua
 * manual — o app não tem como saber que o dinheiro caiu.
 */

const campo = (id: string, valor: string) => `${id}${String(valor.length).padStart(2, '0')}${valor}`;

/** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), como o BR Code exige. */
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(texto)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Nome e cidade só com letras sem acento, números e espaço, no tamanho máximo do padrão. */
const limpar = (s: string, max: number) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ]/g, '').slice(0, max).trim();

export type DadosPix = {
  chave: string;
  nome: string;
  cidade: string;
  valor?: number;
  /** Identificador da cobrança (até 25 letras/números). Sem ele, "***". */
  txid?: string;
};

export function codigoPix({ chave, nome, cidade, valor, txid }: DadosPix): string {
  const conta = campo('00', 'br.gov.bcb.pix') + campo('01', normalizarChavePix(chave) ?? chave.trim());
  const id = (txid ?? '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
  const centavos = valor ? Math.round(valor * 100) : 0;
  const corpo =
    campo('00', '01') +
    campo('26', conta) +
    campo('52', '0000') +
    campo('53', '986') +
    (centavos > 0 ? campo('54', (centavos / 100).toFixed(2)) : '') +
    campo('58', 'BR') +
    campo('59', limpar(nome, 25) || 'RECEBEDOR') +
    campo('60', limpar(cidade, 15) || 'BRASIL') +
    campo('62', campo('05', id)) +
    '6304';
  return corpo + crc16(corpo);
}

/** Dígito verificador de CPF (pesos 10..2 e 11..2) e de CNPJ (5..2,9..2 e 6..2,9..2). */
function digitosConferem(numeros: string, pesos: number[][]): boolean {
  if (/^(\d)\1+$/.test(numeros)) return false;
  return pesos.every(p => {
    const resto = p.reduce((s, peso, j) => s + Number(numeros[j]) * peso, 0) % 11;
    return Number(numeros[p.length]) === (resto < 2 ? 0 : 11 - resto);
  });
}
const cpfValido = (d: string) => d.length === 11 && digitosConferem(d, [[10, 9, 8, 7, 6, 5, 4, 3, 2], [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]]);
const cnpjValido = (d: string) => d.length === 14 && digitosConferem(d, [[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]]);
/** DDD válido (11 a 99) + 8 dígitos (fixo) ou 9 começando em 9 (celular). */
const telefoneBR = (d: string) => /^[1-9][1-9](\d{8}|9\d{8})$/.test(d);

export type TipoChavePix = 'email' | 'telefone' | 'cpf' | 'cnpj' | 'aleatoria';

/**
 * Põe a chave no formato do diretório do PIX, aceitando como as pessoas
 * costumam digitar: CPF e CNPJ com pontuação, telefone com ou sem +55,
 * parênteses e traço, e-mail com maiúscula. Devolve null se não for chave.
 *
 * Onze dígitos soltos podem ser CPF ou celular: vale o CPF quando o dígito
 * verificador confere; senão, celular. Telefone com +55 ou com parênteses
 * nunca vira CPF.
 */
export function analisarChavePix(chave: string): { chave: string; tipo: TipoChavePix } | null {
  const c = (chave ?? '').trim();
  if (!c) return null;
  if (c.includes('@')) {
    const email = c.toLowerCase();
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && email.length <= 77 ? { chave: email, tipo: 'email' } : null;
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c)) return { chave: c.toLowerCase(), tipo: 'aleatoria' };
  if (/[^\d\s.\-/()+]/.test(c)) return null;
  const d = c.replace(/\D/g, '');
  const pareceTelefone = c.startsWith('+') || c.includes('(');
  if (!pareceTelefone) {
    if (cpfValido(d)) return { chave: d, tipo: 'cpf' };
    if (cnpjValido(d)) return { chave: d, tipo: 'cnpj' };
  }
  const local = d.length >= 12 && d.startsWith('55') ? d.slice(2) : d;
  return telefoneBR(local) ? { chave: `+55${local}`, tipo: 'telefone' } : null;
}

export const normalizarChavePix = (chave: string) => analisarChavePix(chave)?.chave ?? null;

/** Chave PIX aceitável: e-mail, telefone, CPF/CNPJ com dígito certo ou aleatória. */
export const chavePixValida = (chave: string) => analisarChavePix(chave) !== null;

/** Maior valor que cabe no campo 54 do BR Code (13 caracteres). */
const VALOR_MAXIMO = 9_999_999_999.99;

/**
 * Lê o valor digitado em reais e arredonda para centavos. Aceita "80",
 * "80,50", "80.50", "1.234,56", "1,234.56" e "R$ 80". O último ponto ou
 * vírgula seguido de 1 ou 2 dígitos é o separador decimal; os outros são de
 * milhar. Antes, "80.50" virava 8050. Devolve null se não for um valor válido.
 */
export function lerValorEmReais(texto: string): number | null {
  const t = (texto ?? '').replace(/R\$|\s/gi, '');
  if (!/^\d[\d.,]*$/.test(t)) return null;
  const decimal = t.match(/[.,](\d{1,2})$/);
  const parteInteira = decimal ? t.slice(0, -decimal[0].length) : t;
  // Separador de milhar só em grupos de três: "0,004" não é 4 reais.
  if (!/^\d+$/.test(parteInteira) && !/^[1-9]\d{0,2}([.,]\d{3})+$/.test(parteInteira)) return null;
  const inteiro = parteInteira.replace(/[.,]/g, '');
  const valor = Math.round(Number(`${inteiro}.${decimal ? decimal[1] : '0'}`) * 100) / 100;
  return Number.isFinite(valor) && valor >= 0.01 && valor <= VALOR_MAXIMO ? valor : null;
}

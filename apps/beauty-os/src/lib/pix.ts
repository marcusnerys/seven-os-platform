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
  const conta = campo('00', 'br.gov.bcb.pix') + campo('01', chave.trim());
  const id = (txid ?? '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
  const corpo =
    campo('00', '01') +
    campo('26', conta) +
    campo('52', '0000') +
    campo('53', '986') +
    (valor && valor > 0 ? campo('54', valor.toFixed(2)) : '') +
    campo('58', 'BR') +
    campo('59', limpar(nome, 25) || 'RECEBEDOR') +
    campo('60', limpar(cidade, 15) || 'BRASIL') +
    campo('62', campo('05', id)) +
    '6304';
  return corpo + crc16(corpo);
}

/** Chave PIX aceitável: e-mail, telefone +55, CPF/CNPJ (só dígitos) ou aleatória. */
export function chavePixValida(chave: string): boolean {
  const c = chave.trim();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c)
    || /^\+55\d{10,11}$/.test(c)
    || /^\d{11}$/.test(c) || /^\d{14}$/.test(c)
    || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c);
}

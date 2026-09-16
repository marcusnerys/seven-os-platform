import { parseStatementText } from '../node_modules/.tmp/ocr.mjs';
import assert from 'node:assert';

const TODAY = '2026-09-01';
const sample = `
EXTRATO CONTA CORRENTE
27/08/2026  PIX RECEBIDO MARIA        R$ 1.250,00
28/08/2026  PAGAMENTO ALUGUEL         -2.000,00
28/08  COMPRA SUPERMERCADO PAO        R$ 87,45
29/08/2026  UBER VIAGEM                 32,90
SALDO ANTERIOR
2026-08-30  VENDA DE PRODUTO          R$ 450,00
linha sem valor nenhum aqui
`;

const txs = parseStatementText(sample, TODAY);
console.log(JSON.stringify(txs, null, 1));

assert.strictEqual(txs.length, 5, `esperado 5 transacoes, veio ${txs.length}`);

const pix = txs[0];
assert.strictEqual(pix.date, '2026-08-27');
assert.strictEqual(pix.amount, 1250);
assert.strictEqual(pix.type, 'revenue');

const aluguel = txs[1];
assert.strictEqual(aluguel.amount, 2000);
assert.strictEqual(aluguel.type, 'expense');
assert.strictEqual(aluguel.category, 'Moradia');

const mercado = txs[2];
assert.strictEqual(mercado.date, '2026-08-28');
assert.strictEqual(mercado.amount, 87.45);
assert.strictEqual(mercado.category, 'Alimentação');

const uber = txs[3];
assert.strictEqual(uber.amount, 32.90);
assert.strictEqual(uber.category, 'Transporte');

const venda = txs[4];
assert.strictEqual(venda.date, '2026-08-30');
assert.strictEqual(venda.amount, 450);
assert.strictEqual(venda.type, 'revenue');

// Milhar sem centavos. O extrato brasileiro escreve valor redondo como
// "R$ 1.500", e ler isso como decimal erra o lançamento por um fator de mil:
// um aluguel de mil e quinhentos reais entrava no Financeiro como um real.
const milhar = [
  ['05/09/2026  ALUGUEL DA SALA  R$ 1.500',     1500],
  ['06/09/2026  COMPRA MATERIAL  R$ 2.350',     2350],
  ['07/09/2026  NOTEBOOK NOVO    R$ 12.499,90', 12499.90],
  ['08/09/2026  CAFE DA MANHA    R$ 8,50',      8.50],
  ['09/09/2026  LANCHE RAPIDO    R$ 15',        15],
];

for (const [linha, esperado] of milhar) {
  const [tx] = parseStatementText(linha, TODAY);
  assert.ok(tx, `nao extraiu transacao de: ${linha}`);
  assert.strictEqual(tx.amount, esperado, `${linha.trim()} -> esperado ${esperado}, veio ${tx.amount}`);
}

console.log('\nOK — parser passou em todos os asserts');

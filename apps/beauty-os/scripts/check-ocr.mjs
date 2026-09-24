import { parseStatementText, sanitizarTransacoes } from "../node_modules/.tmp/ocr.mjs";
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

// Data e valor disputam os mesmos caracteres. O Tesseract troca vírgula por
// ponto com frequência, então "R$ 8,10" chega como "8.10" — e o extrator de
// data lia isso como dia 8, mês 10: engolia o valor e a linha era descartada
// sem aviso. Separador de data de duas partes agora é só barra ou hífen.
const valorViraData = [
  ['PAGAMENTO TARIFA BANCO 8.10',  8.10],
  ['PIX RECEBIDO JOAO 10.12',     10.12],
  ['COMPRA MERCADO 12.05',        12.05],
];

for (const [linha, esperado] of valorViraData) {
  const [tx] = parseStatementText(linha, TODAY);
  assert.ok(tx, `linha descartada: ${linha}`);
  assert.strictEqual(tx.amount, esperado, `${linha} -> esperado ${esperado}, veio ${tx.amount}`);
  assert.strictEqual(tx.date, TODAY, `${linha} -> valor virou data ${tx.date}`);
}

// Data que não existe no calendário. Ia para o banco como "2026-02-31" e a
// coluna date recusa, derrubando a importação inteira.
const dataImpossivel = [
  '31/02/2026  CONTA DE LUZ  89,90',
  '00/08/2026  BOLETO        50,00',
  '30/02       TARIFA        12,00',
];

for (const linha of dataImpossivel) {
  const [tx] = parseStatementText(linha, TODAY);
  assert.ok(tx, `linha descartada: ${linha}`);
  assert.strictEqual(tx.date, TODAY, `${linha.trim()} -> aceitou data invalida ${tx.date}`);
}

// Ano truncado pelo OCR: descarta só o ano e usa o do extrato, em vez de
// montar "202-08-27" e mandar isso para a coluna date.
{
  const [tx] = parseStatementText('27/08/202   BOLETO        50,00', TODAY);
  assert.ok(tx, 'linha descartada: ano truncado');
  assert.strictEqual(tx.date, '2026-08-27');
}

// Toda data produzida precisa existir no calendário.
for (const linha of [...dataImpossivel, '31/12/2026 X 10,00', '29/02/2024 Y 10,00']) {
  const [tx] = parseStatementText(linha, TODAY);
  const d = new Date(`${tx.date}T00:00:00Z`);
  assert.strictEqual(d.toISOString().slice(0, 10), tx.date, `data irreal: ${tx.date}`);
}

// Data separada por ponto nas três partes continua válida.
{
  const [tx] = parseStatementText('27.08.2026  SAQUE  100,00', TODAY);
  assert.ok(tx, 'nao extraiu 27.08.2026');
  assert.strictEqual(tx.date, '2026-08-27');
  assert.strictEqual(tx.amount, 100);
}


// Linhas de saldo e total não são lançamentos. Todo extrato tem "SALDO
// ANTERIOR" e "SALDO DO DIA" com valor; sem esta regra elas entravam como
// despesas já marcadas para importar, inflando o gasto do mês.
for (const linha of ['SALDO ANTERIOR  1.234,56', 'SALDO DO DIA R$ 980,00', 'TOTAL DE DEBITOS 450,00', 'Subtotal 120,00', 'LIMITE DISPONIVEL 2.000,00']) {
  assert.strictEqual(parseStatementText(linha, TODAY).length, 0, `nao deveria importar: ${linha}`);
}

// Hífen com espaço é separador, não sinal. "Venda - R$ 50,00" é receita.
// Colado no valor continua sendo sinal: "-2.000,00" é saída.
{
  const [venda] = parseStatementText('Venda de produto - R$ 50,00', TODAY);
  assert.ok(venda, 'venda descartada');
  assert.strictEqual(venda.type, 'revenue', 'hifen separador virou despesa');
  assert.strictEqual(venda.amount, 50);

  const [saida] = parseStatementText('TRANSFERENCIA ENVIADA -2.000,00', TODAY);
  assert.strictEqual(saida.type, 'expense');
  assert.strictEqual(saida.amount, 2000);
}

// O padrão de valor aceitava um "R" solto antes dos dígitos e comia a última
// letra da descrição: "FORNECEDOR 50,00" virava "FORNECEDO".
{
  const [tx] = parseStatementText('PAGAMENTO FORNECEDOR 50,00', TODAY);
  assert.strictEqual(tx.description, 'PAGAMENTO FORNECEDOR');
  const [tx2] = parseStatementText('COMPRA MATERIAL R$ 30,00', TODAY);
  assert.strictEqual(tx2.description, 'COMPRA MATERIAL');
  assert.strictEqual(tx2.amount, 30);
}

// Data sem ano que cairia no futuro é do ano anterior: extrato de dezembro
// lido em janeiro não pode virar lançamento de dezembro do ano seguinte.
{
  const [tx] = parseStatementText('28/12  PIX RECEBIDO ANA  R$ 100,00', '2027-01-10');
  assert.strictEqual(tx.date, '2026-12-28');
  const [tx2] = parseStatementText('05/01  PIX RECEBIDO ANA  R$ 100,00', '2027-01-10');
  assert.strictEqual(tx2.date, '2027-01-05');
}

// Saída da IA: nada entra no banco sem passar por aqui. Valor em texto,
// negativo, tipo desconhecido, data inválida ou ausente.
{
  const bruto = [
    { date: '2026-09-18', description: 'PIX', amount: '250,00', type: 'revenue', category: 'Receita' },
    { date: '2026-09-19', description: 'Aluguel', amount: -1500, type: 'expense', category: 'Aluguel' },
    { date: '31/02/2026', description: 'Luz', amount: 89.9, type: 'saida', category: 'Moradia' },
    { description: 'Sem valor', amount: 'abc', type: 'expense' },
    { date: '2026-09-20', description: '', amount: 10, type: 'revenue' },
    null,
    { date: '2026-09-21', description: 'Venda', amount: '1.234,56', type: 'entrada' },
  ];
  const limpo = sanitizarTransacoes(bruto, TODAY);
  assert.strictEqual(limpo.length, 4, `esperado 4, veio ${limpo.length}: ${JSON.stringify(limpo)}`);
  assert.strictEqual(limpo[0].amount, 250);
  assert.strictEqual(limpo[1].amount, 1500);
  assert.strictEqual(limpo[1].type, 'expense');
  assert.strictEqual(limpo[2].date, TODAY, 'data invalida cai em hoje');
  assert.strictEqual(limpo[2].type, 'expense', 'saida = expense');
  assert.strictEqual(limpo[3].amount, 1234.56);
  assert.strictEqual(limpo[3].type, 'revenue', 'entrada = revenue');
  assert.deepStrictEqual(sanitizarTransacoes('nao e lista', TODAY), []);
}

// Saldo e total só quando abrem a linha. No meio da descrição são
// lançamentos reais: transferência da conta-salário, posto Total, juros do
// cheque especial.
for (const [linha, valor] of [['TRANSF SALDO C/SAL P/CC 2.500,00', 2500], ['POSTO TOTAL 150,00', 150], ['JUROS LIMITE DA CONTA 38,20', 38.2]]) {
  const [tx] = parseStatementText(linha, TODAY);
  assert.ok(tx, `lancamento real descartado: ${linha}`);
  assert.strictEqual(tx.amount, valor);
}

// Lançamento agendado para daqui a poucos dias fica no ano corrente; só volta
// um ano quando a data cairia meses à frente (dezembro lido em janeiro).
{
  const [agendado] = parseStatementText('25/09  PIX AGENDADO  R$ 200,00', '2026-09-23');
  assert.strictEqual(agendado.date, '2026-09-25');
}

// Inteiro com R$ e sinal depois do símbolo, sem lookbehind (iOS antigo não
// suporta e a leitura inteira quebrava).
{
  const [tx] = parseStatementText('ESTORNO TARIFA R$ -15', TODAY);
  assert.strictEqual(tx.amount, 15);
  assert.strictEqual(tx.type, 'expense');
}

console.log('\nOK — parser passou em todos os asserts');

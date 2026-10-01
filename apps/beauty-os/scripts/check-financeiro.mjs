import assert from 'node:assert';
import { periodo, moverPeriodo, serie, noPeriodo, somarMeses, dataNoMes, mesesAGerar, parcelas, valorDasParcelas, dizimo, ehDizimo } from '../node_modules/.tmp/financeiro.mjs';

// Períodos. 01/10/2026 é quinta-feira; a semana começa no domingo 27/09.
assert.deepStrictEqual({ ...periodo('dia', '2026-10-01'), pontos: undefined }, { tipo: 'dia', inicio: '2026-10-01', fim: '2026-10-01', rotulo: 'qui, 01/10', pontos: undefined });
const semana = periodo('semana', '2026-10-01');
assert.strictEqual(semana.inicio, '2026-09-27');
assert.strictEqual(semana.fim, '2026-10-03');
assert.strictEqual(semana.rotulo, '27/09 – 03/10');
assert.strictEqual(semana.pontos.length, 7);
const fev = periodo('mes', '2028-02-10');
assert.strictEqual(fev.fim, '2028-02-29', 'fevereiro bissexto');
assert.strictEqual(fev.rotulo, 'Fevereiro 2028');
assert.strictEqual(fev.pontos.length, 29);
const ano = periodo('ano', '2026-10-01');
assert.deepStrictEqual([ano.inicio, ano.fim, ano.rotulo, ano.pontos[9]], ['2026-01-01', '2026-12-31', '2026', '2026-10']);

// Navegação: mês de 31 de janeiro vai para fevereiro, não pula para março.
assert.strictEqual(moverPeriodo('mes', '2026-01-31', 1), '2026-02-01');
assert.strictEqual(moverPeriodo('mes', '2026-01-15', -1), '2025-12-01');
assert.strictEqual(moverPeriodo('semana', '2026-10-01', -1), '2026-09-24');
assert.strictEqual(moverPeriodo('dia', '2026-12-31', 1), '2027-01-01');
assert.strictEqual(moverPeriodo('ano', '2026-06-10', 1), '2027-01-01');

// Séries: soma por dia na semana, por mês no ano; fora do período não entra.
const lista = [
  { date: '2026-09-27', amount: 100, type: 'revenue' },
  { date: '2026-09-27', amount: 50, type: 'revenue' },
  { date: '2026-09-29', amount: 30, type: 'expense' },
  { date: '2026-10-03', amount: 20, type: 'revenue' },
  { date: '2026-10-04', amount: 999, type: 'revenue' },
];
assert.deepStrictEqual(serie(lista, semana, 'revenue'), [150, 0, 0, 0, 0, 0, 20]);
assert.deepStrictEqual(serie(lista, semana, 'expense'), [0, 0, 30, 0, 0, 0, 0]);
assert.deepStrictEqual(serie(lista, semana, 'saldo'), [150, 0, -30, 0, 0, 0, 20]);
assert.deepStrictEqual(serie(lista, ano, 'revenue').slice(8, 10), [150, 1019]);
assert.strictEqual(noPeriodo(lista, semana).length, 4);

// Meses e vencimentos.
assert.strictEqual(somarMeses('2026-11', 3), '2027-02');
assert.strictEqual(dataNoMes('2027-02', 31), '2027-02-28', 'dia 31 em fevereiro vira o último dia');
assert.strictEqual(dataNoMes('2026-10', 5), '2026-10-05');

// Gasto fixo: do início até o mês atual; depois do último lançado, só o que falta.
assert.deepStrictEqual(mesesAGerar('2026-08', null, '2026-10'), ['2026-08', '2026-09', '2026-10']);
assert.deepStrictEqual(mesesAGerar('2026-08', '2026-09', '2026-10'), ['2026-10']);
assert.deepStrictEqual(mesesAGerar('2026-08', '2026-10', '2026-10'), []);
assert.deepStrictEqual(mesesAGerar('2026-12', null, '2026-10'), [], 'começa no futuro: nada ainda');

// Parcelas: uma por mês, numeradas, atravessando o ano.
const p = parcelas('Geladeira', 250, '2026-11', 31, 3);
assert.deepStrictEqual(p.map(x => [x.competencia, x.date, x.description]), [
  ['2026-11', '2026-11-30', 'Geladeira (1/3)'],
  ['2026-12', '2026-12-31', 'Geladeira (2/3)'],
  ['2027-01', '2027-01-31', 'Geladeira (3/3)'],
]);
// Total que não divide exato: os centavos que sobram vão na primeira.
assert.deepStrictEqual(valorDasParcelas(100, 3), [33.34, 33.33, 33.33]);
assert.strictEqual(valorDasParcelas(1999.9, 10).reduce((a, b) => a + b, 0).toFixed(2), '1999.90');

// Dízimo: 10% das receitas do período, menos o já devolvido.
const outubro = periodo('mes', '2026-10-15');
const contas = [
  { date: '2026-10-05', amount: 3000, type: 'revenue', category: 'Salário', description: 'Salário' },
  { date: '2026-10-20', amount: 455.5, type: 'revenue', category: 'Vendas', description: 'Bolo' },
  { date: '2026-10-06', amount: 200, type: 'expense', category: 'Dízimo', description: 'Dízimo' },
  { date: '2026-10-07', amount: 50, type: 'expense', category: 'Igreja', description: 'dizimo da semana' },
  { date: '2026-10-08', amount: 80, type: 'expense', category: 'Alimentação', description: 'Mercado' },
  { date: '2026-09-30', amount: 999, type: 'revenue', category: 'Vendas', description: 'fora' },
];
assert.deepStrictEqual(dizimo(contas, outubro, 10), { receitas: 3455.5, devido: 345.55, devolvido: 250, falta: 95.55 });
assert.strictEqual(dizimo(contas, outubro, 10).falta, 95.55);
assert.strictEqual(dizimo([{ date: '2026-10-05', amount: 100, type: 'revenue', category: 'x', description: 'x' }, { date: '2026-10-06', amount: 30, type: 'expense', category: 'Dízimo', description: '' }], outubro, 10).falta, 0, 'devolveu a mais: falta zero');
assert.strictEqual(ehDizimo({ type: 'revenue', category: 'Dízimo', description: '' }), false, 'receita nunca é dízimo pago');

console.log('OK — períodos, gráficos, fixos, parcelas e dízimo');

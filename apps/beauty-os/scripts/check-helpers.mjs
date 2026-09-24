import assert from 'node:assert';
import { digitosTelefoneBR, formatarTelefoneBR, fimDoEventoICS, ehAniversarioHoje, acharPorNome } from '../node_modules/.tmp/utils.mjs';

// Telefone colado da agenda do celular. Antes "+55 11 99999-8888" virava
// "(55) 11999-9988": DDD errado e um dígito a menos, passando na validação.
const telefones = [
  ['+55 11 99999-8888', '(11) 99999-8888'],
  ['5511999998888',     '(11) 99999-8888'],
  ['011 99999-8888',    '(11) 99999-8888'],
  ['(11) 3333-4444',    '(11) 3333-4444'],
  ['55 11 3333-4444',   '(11) 3333-4444'],
  ['11999998888',       '(11) 99999-8888'],
  ['119',               '(11) 9'],
  ['',                  ''],
];
for (const [entrada, esperado] of telefones) {
  assert.strictEqual(formatarTelefoneBR(entrada), esperado, `formatarTelefoneBR(${JSON.stringify(entrada)})`);
}
assert.strictEqual(digitosTelefoneBR('+55 (11) 99999-8888'), '11999998888');
// DDD 55 legítimo (Rio Grande do Sul) com 11 dígitos não pode perder o 55.
assert.strictEqual(digitosTelefoneBR('(55) 99999-8888'), '55999998888');

// Digitando no campo já formatado, um dígito a mais é ignorado — não pode
// transformar o DDD 55 (RS) em código de país e trocar o número inteiro.
assert.strictEqual(formatarTelefoneBR('(55) 99999-88881'), '(55) 99999-8888');
assert.strictEqual(formatarTelefoneBR('(11) 99999-88881'), '(11) 99999-8888');
assert.strictEqual(formatarTelefoneBR('(55) 9999'), '(55) 9999');

// Evento que atravessa a meia-noite termina no dia seguinte.
assert.strictEqual(fimDoEventoICS('2026-09-30', '23:00', 120), '20261001T010000');
assert.strictEqual(fimDoEventoICS('2026-12-31', '23:30', 60), '20270101T003000');
assert.strictEqual(fimDoEventoICS('2026-09-30', '14:00', 45), '20260930T144500');

// 29/02 é lembrado em 28/02 nos anos não bissextos, e só nesses.
assert.strictEqual(ehAniversarioHoje('1992-02-29', '2027-02-28'), true);
assert.strictEqual(ehAniversarioHoje('1992-02-29', '2028-02-28'), false);
assert.strictEqual(ehAniversarioHoje('1992-02-29', '2028-02-29'), true);
assert.strictEqual(ehAniversarioHoje('1990-09-23', '2026-09-23'), true);
assert.strictEqual(ehAniversarioHoje('', '2026-09-23'), false);
assert.strictEqual(ehAniversarioHoje(undefined, '2026-09-23'), false);

// Nome falado. "Ana" não pode cair em "Mariana".
const clientes = [
  { name: 'Mariana Souza' }, { name: 'Ana Paula' }, { name: 'Luana Reis' },
  { name: 'José Álvaro' }, { name: 'Ana Clara' },
];
assert.deepStrictEqual(acharPorNome(clientes, 'Ana Paula').item, { name: 'Ana Paula' });
assert.strictEqual(acharPorNome(clientes, 'Ana').ambiguo, true, 'duas Anas: deve perguntar');
assert.strictEqual(acharPorNome(clientes, 'Ana').item, null);
assert.deepStrictEqual(acharPorNome(clientes, 'mariana').item, { name: 'Mariana Souza' });
assert.deepStrictEqual(acharPorNome(clientes, 'jose alvaro').item, { name: 'José Álvaro' }, 'sem acento');
assert.deepStrictEqual(acharPorNome(clientes, 'Reis').item, { name: 'Luana Reis' }, 'sobrenome como palavra inteira');
assert.strictEqual(acharPorNome(clientes, 'Pedro').item, null);
assert.strictEqual(acharPorNome(clientes, '').item, null);
assert.deepStrictEqual(acharPorNome([{ name: 'Mariana' }], 'Ana').item, { name: 'Mariana' }, 'trecho só vale quando é o único');

console.log('OK — helpers de telefone, calendário, aniversário e nome');

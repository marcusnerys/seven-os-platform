import assert from 'node:assert';
import { escapeICS } from '../node_modules/.tmp/utils.mjs';

// RFC 5545: barra invertida, ponto-e-vírgula e vírgula são separadores e
// precisam ser escapados; quebra de linha vira a sequência barra-n.
// Sem isto, um cliente chamado "Silva, João" corrompe o arquivo inteiro e o
// aplicativo de calendário recusa o evento.
const casos = [
  ['Silva, João',      'Silva\\, João'],
  ['Auto;Center',      'Auto\\;Center'],
  ['linha1\nlinha2',   'linha1\\nlinha2'],
  ['linha1\r\nlinha2', 'linha1\\nlinha2'],
  ['a\\b',             'a\\\\b'],
  ['Corte simples',    'Corte simples'],
  ['',                 ''],
];

for (const [entrada, esperado] of casos) {
  const obtido = escapeICS(entrada);
  assert.strictEqual(
    obtido, esperado,
    `escapeICS(${JSON.stringify(entrada)}) devolveu ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`
  );
  console.log(`OK  ${JSON.stringify(entrada)} -> ${JSON.stringify(obtido)}`);
}

console.log('\nOK — escapeICS passou em todos os asserts');

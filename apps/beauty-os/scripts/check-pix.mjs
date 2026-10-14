import assert from 'node:assert';
import { codigoPix, crc16, chavePixValida } from '../node_modules/.tmp/pix.mjs';

// Exemplo oficial do Manual do BR Code (Banco Central): chave aleatória,
// sem valor, "Fulano de Tal", "BRASILIA", txid "***" → CRC 1D3D.
const oficial = '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D';
assert.strictEqual(codigoPix({ chave: '123e4567-e12b-12d1-a456-426655440000', nome: 'Fulano de Tal', cidade: 'BRASILIA' }), oficial);
assert.strictEqual(crc16(oficial.slice(0, -4)), '1D3D');

// Com valor: campo 54 com duas casas; o CRC confere o código inteiro.
const comValor = codigoPix({ chave: 'ana@exemplo.com', nome: 'Studio Bela Ação', cidade: 'São Paulo', valor: 80, txid: 'corte-ana 01' });
assert.ok(comValor.includes('540580.00'), 'valor');
assert.ok(comValor.includes('5916Studio Bela Acao'), 'nome sem acento');
assert.ok(comValor.includes('6009Sao Paulo'), 'cidade sem acento');
assert.ok(comValor.includes('62140510corteana01'), 'txid só letras e números');
assert.strictEqual(crc16(comValor.slice(0, -4)), comValor.slice(-4));

// Nome longo é cortado em 25; cidade em 15.
const longo = codigoPix({ chave: '+5511999998888', nome: 'Salão de Beleza da Maria Aparecida', cidade: 'São José dos Campos' });
assert.ok(longo.includes('5924Salao de Beleza da Maria6015'), 'nome cortado em 25 sem espaço no fim');
assert.ok(longo.includes('6015Sao Jose dos Ca'), 'cidade 15');

assert.ok(chavePixValida('ana@exemplo.com'));
assert.ok(chavePixValida('+5511999998888'));
assert.ok(chavePixValida('12345678901'));
assert.ok(chavePixValida('123e4567-e12b-12d1-a456-426655440000'));
assert.ok(!chavePixValida('11 99999-8888'), 'telefone precisa do +55 e só dígitos');
assert.ok(!chavePixValida(''));

console.log('OK — PIX copia e cola (BR Code)');

import assert from 'node:assert';
import { codigoPix, crc16, chavePixValida, analisarChavePix, lerValorEmReais } from '../node_modules/.tmp/pix.mjs';

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

// Chaves como as pessoas digitam viram o formato do diretório do PIX.
const chaves = {
  'ana@exemplo.com': ['ana@exemplo.com', 'email'],
  'Ana@Exemplo.com ': ['ana@exemplo.com', 'email'],
  '529.982.247-25': ['52998224725', 'cpf'],
  '52998224725': ['52998224725', 'cpf'],
  '11.222.333/0001-81': ['11222333000181', 'cnpj'],
  // Celular sem +55 tem 11 dígitos como o CPF: com dígito de CPF errado, é celular.
  '11999998888': ['+5511999998888', 'telefone'],
  '(11) 99999-8888': ['+5511999998888', 'telefone'],
  '+55 (11) 99999-8888': ['+5511999998888', 'telefone'],
  '5511999998888': ['+5511999998888', 'telefone'],
  '1133334444': ['+551133334444', 'telefone'],
  '123E4567-E12B-12D1-A456-426655440000': ['123e4567-e12b-12d1-a456-426655440000', 'aleatoria'],
};
for (const [digitada, [chave, tipo]] of Object.entries(chaves)) {
  assert.deepStrictEqual(analisarChavePix(digitada), { chave, tipo }, digitada);
}
for (const invalida of ['', '00000000000', '12345678901234', 'ana@', 'abc', '119999']) {
  assert.ok(!chavePixValida(invalida), `inválida: ${invalida}`);
}
assert.ok(codigoPix({ chave: '529.982.247-25', nome: 'X', cidade: 'Y', valor: 10 }).includes('011152998224725'), 'CPF sem pontuação no código');

// Valor: o último separador seguido de 1 ou 2 dígitos é o decimal.
const valores = {
  '80': 80, '80,50': 80.5, '80.50': 80.5, '80.5': 80.5, '1.234,56': 1234.56, '1,234.56': 1234.56,
  'R$ 80': 80, ' 150 ': 150, '1.500': 1500, '1.500,00': 1500, '0,01': 0.01,
};
for (const [texto, esperado] of Object.entries(valores)) assert.strictEqual(lerValorEmReais(texto), esperado, texto);
for (const invalido of ['', 'abc', '0', '0,00', '0,004', '-5', '80,5,0x', '99999999999']) {
  assert.strictEqual(lerValorEmReais(invalido), null, `inválido: ${invalido}`);
}
// O campo 54 sai sempre em centavos.
assert.ok(codigoPix({ chave: 'a@b.co', nome: 'X', cidade: 'Y', valor: 80.499999 }).includes('540580.50'), 'arredonda para centavos');

console.log('OK — PIX copia e cola (BR Code)');

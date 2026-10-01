import assert from 'node:assert';
import { lerVCard, contatosNovos } from '../node_modules/.tmp/contatos.mjs';

// Exportação do app Contatos do iPhone (vCard 3.0): campos agrupados em
// "item1.", tipos repetidos, foto em base64 dobrada terminando em "=".
const iphone = [
  'BEGIN:VCARD',
  'VERSION:3.0',
  'N:Souza;Ana;Maria;;',
  'FN:Ana Maria Souza',
  'item1.TEL;type=pref:(11) 3333-4444',
  'TEL;type=CELL;type=VOICE:+55 11 99999-8888',
  'item2.EMAIL;type=INTERNET:ana@exemplo.com',
  'PHOTO;ENCODING=b;TYPE=JPEG:/9j/4AAQSkZJRgABAQAAAQ==',
  'END:VCARD',
  'BEGIN:VCARD',
  'VERSION:3.0',
  'N:Lima;Mariana;;;',
  'TEL;type=CELL:11988887777',
  'END:VCARD',
  'BEGIN:VCARD',
  'VERSION:3.0',
  'ORG:Salão Bela\\, Filial;Centro',
  'TEL:1144445555',
  'END:VCARD',
  'BEGIN:VCARD',
  'VERSION:3.0',
  'TEL:11911112222',
  'END:VCARD',
].join('\r\n');

const lidos = lerVCard(iphone);
assert.deepStrictEqual(lidos, [
  { nome: 'Ana Maria Souza', telefone: '+55 11 99999-8888', email: 'ana@exemplo.com' },
  { nome: 'Mariana Lima', telefone: '11988887777', email: '' },
  { nome: 'Salão Bela, Filial', telefone: '1144445555', email: '' },
], 'iPhone: celular preferido, nome pelo N ou pela empresa, contato sem nome ignorado');

// Linha dobrada (continua com espaço) e Android antigo em quoted-printable.
const dobrado = 'BEGIN:VCARD\nVERSION:3.0\nFN:Beatriz Nasciment\n o\nTEL:11977776666\nEND:VCARD\n';
assert.strictEqual(lerVCard(dobrado)[0].nome, 'Beatriz Nascimento');
const android = [
  'BEGIN:VCARD',
  'VERSION:2.1',
  'FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Jo=C3=A3o Pedro da Concei=C3=A7=',
  '=C3=A3o',
  'TEL;CELL:11966665555',
  'END:VCARD',
].join('\n');
assert.deepStrictEqual(lerVCard(android), [{ nome: 'João Pedro da Conceição', telefone: '11966665555', email: '' }]);
assert.strictEqual(lerVCard('﻿' + dobrado)[0].nome, 'Beatriz Nascimento', 'BOM no início');
assert.deepStrictEqual(lerVCard(''), []);
assert.deepStrictEqual(lerVCard('texto qualquer sem vcard'), []);

// Quem já é cliente não entra de novo, pelo telefone em qualquer formato ou,
// sem telefone, pelo nome. Repetidos no próprio arquivo entram uma vez.
const clientes = [
  { name: 'Ana Maria Souza', phone: '(11) 99999-8888' },
  { name: 'Carla', phone: '' },
];
const novos = contatosNovos([
  { nome: 'Ana M.', telefone: '+55 11 99999-8888', email: '' },
  { nome: 'Carla', telefone: '11955554444', email: '' },
  { nome: 'Mariana Lima', telefone: '11988887777', email: 'm@x.com' },
  { nome: 'Mariana Lima', telefone: '(11) 98888-7777', email: '' },
  { nome: 'Sem Telefone', telefone: '', email: '' },
  { nome: 'sem telefone', telefone: '', email: '' },
  { nome: '  ', telefone: '11900000000', email: '' },
], clientes);
assert.deepStrictEqual(novos, [
  { name: 'Mariana Lima', phone: '(11) 98888-7777', email: 'm@x.com' },
  { name: 'Sem Telefone', phone: '', email: '' },
]);

// Número de outro país não vira brasileiro; +55 e 0055 continuam nacionais.
assert.deepStrictEqual(contatosNovos([
  { nome: 'John', telefone: '+1 415 555 0100', email: '' },
  { nome: 'Rui', telefone: '00351 912 345 678', email: '' },
  { nome: 'Lia', telefone: '0055 11 97777-1111', email: '' },
], []).map(c => c.phone), ['+1 415 555 0100', '00351 912 345 678', '(11) 97777-1111']);

console.log('OK — importação de contatos (.vcf e seletor)');

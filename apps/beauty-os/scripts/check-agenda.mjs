import assert from 'node:assert';
import { montarCalendario } from '../node_modules/.tmp/agenda.mjs';

const agora = new Date(Date.UTC(2026, 8, 30, 12, 0, 0));
const ics = montarCalendario([
  { id: 'a1', data: '2026-09-30', hora: '14:00', duracao: 45, servico: 'Corte', cliente: 'Ana; Souza, filha', status: 'Confirmado', observacao: 'traz foto\nda referência', negocio: 'Studio' },
  // 23h30 em Brasília já é o dia seguinte em UTC, e o fim atravessa a meia-noite.
  { id: 'a2', data: '2026-12-31', hora: '23:30', duracao: 60, servico: 'Escova', cliente: 'Bia', status: 'Pendente', observacao: null, negocio: 'Studio' },
  { id: 'a3', data: '30/09/2026', hora: '14:00', duracao: 60, servico: 'X', cliente: 'Y', status: 'Confirmado', observacao: null, negocio: 'Studio' },
  { id: 'a4', data: '2026-10-01', hora: '09:00', duracao: 0, servico: 'Manicure', cliente: 'Carla', status: 'Confirmado', observacao: null, negocio: 'Studio' },
], 'Studio Bela', agora);

const linhas = ics.split('\r\n');
assert.ok(ics.endsWith('\r\n'), 'termina com CRLF');
assert.strictEqual(linhas[0], 'BEGIN:VCALENDAR');
assert.ok(linhas.includes('X-WR-CALNAME:Studio Bela'));
assert.ok(linhas.includes('DTSTART:20260930T170000Z'), '14h em Brasília = 17h UTC');
assert.ok(linhas.includes('DTEND:20260930T174500Z'));
assert.ok(linhas.includes('SUMMARY:Corte - Ana\\; Souza\\, filha'), 'escapa ; e ,');
assert.ok(linhas.includes('DESCRIPTION:traz foto\\nda referência'));
assert.ok(linhas.includes('DTSTART:20270101T023000Z') && linhas.includes('DTEND:20270101T033000Z'), 'vira o dia e o ano');
assert.ok(linhas.includes('STATUS:TENTATIVE'), 'pendente fica provisório');
assert.ok(!ics.includes('UID:a3@'), 'data fora do formato é ignorada');
assert.ok(linhas.includes('DTEND:20261001T130000Z'), 'duração zero vira 60 min');
assert.strictEqual(linhas.filter(l => l === 'BEGIN:VEVENT').length, 3);
assert.ok(linhas.includes('DTSTAMP:20260930T120000Z'));

// Linha longa é dobrada em até 75 bytes, sem partir caractere acentuado.
const longo = montarCalendario([{ id: 'b', data: '2026-09-30', hora: '10:00', duracao: 60, servico: 'Coloração completa com hidratação profunda e finalização', cliente: 'Maria da Conceição Albuquerque', status: 'Confirmado', observacao: null, negocio: 'S' }], 'S', agora);
for (const l of longo.split('\r\n')) assert.ok(new TextEncoder().encode(l).length <= 75, `linha longa: ${l}`);
assert.ok(longo.replace(/\r\n /g, '').includes('SUMMARY:Coloração completa com hidratação profunda e finalização - Maria da Conceição Albuquerque'));

// CR solto e caracteres de controle da reserva pública não quebram a linha.
const sujo = montarCalendario([{ id: 'c', data: '2026-09-30', hora: '10:00', duracao: 60, servico: 'Corte', cliente: 'Ana\rBia\u0007', status: 'Confirmado', observacao: null, negocio: 'S' }], 'S', agora);
assert.ok(sujo.split('\r\n').includes('SUMMARY:Corte - Ana\\nBia'));
assert.ok(!/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(sujo.replace(/\r\n/g, '')));

console.log('OK — agenda para assinatura no calendário');

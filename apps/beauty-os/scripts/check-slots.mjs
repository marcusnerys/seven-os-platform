import assert from 'node:assert';
import { horarioIndisponivel } from '../node_modules/.tmp/utils.mjs';

// A tela precisa recusar exatamente o que a RPC de reserva recusa
// (migration 0010). Enquanto discordavam, o visitante escolhia um horário,
// preenchia nome e telefone e só no envio descobria que não dava.

const NAO_HOJE = [false, 0];

// Bloco de 120 min às 08:00 ocupa 08:00 e 09:00, e libera 10:00.
{
  const ocupados = [{ time: '08:00', duration: 120 }];
  const esperado = {
    '08:00': true, '09:00': true, '10:00': false, '11:00': false, '13:00': false,
  };
  for (const [slot, indisponivel] of Object.entries(esperado)) {
    assert.strictEqual(
      horarioIndisponivel(slot, 60, ocupados, ...NAO_HOJE), indisponivel,
      `bloco 08:00+120min: ${slot} deveria estar ${indisponivel ? 'bloqueado' : 'livre'}`
    );
  }
}

// A duração do serviço escolhido também conta: um serviço de 120 min às 09:00
// invade as 10:00, então esbarra num bloco que começa às 10:00.
{
  const ocupados = [{ time: '10:00', duration: 60 }];
  assert.strictEqual(horarioIndisponivel('09:00', 60, ocupados, ...NAO_HOJE), false);
  assert.strictEqual(horarioIndisponivel('09:00', 120, ocupados, ...NAO_HOJE), true);
}

// Encostar não é sobrepor: termina 10:00, outro começa 10:00.
{
  const ocupados = [{ time: '10:00', duration: 60 }];
  assert.strictEqual(horarioIndisponivel('09:00', 60, ocupados, ...NAO_HOJE), false);
  assert.strictEqual(horarioIndisponivel('11:00', 60, ocupados, ...NAO_HOJE), false);
}

// Hoje às 16:00: tudo até as 16:00 já passou.
{
  const agora = 16 * 60;
  assert.strictEqual(horarioIndisponivel('08:00', 60, [], true, agora), true);
  assert.strictEqual(horarioIndisponivel('15:00', 60, [], true, agora), true);
  assert.strictEqual(horarioIndisponivel('16:00', 60, [], true, agora), true);
  assert.strictEqual(horarioIndisponivel('17:00', 60, [], true, agora), false);
  // Em outro dia o relógio de hoje não vale.
  assert.strictEqual(horarioIndisponivel('08:00', 60, [], false, agora), false);
}

// Agenda vazia libera tudo.
for (const slot of ['08:00', '13:00', '18:00']) {
  assert.strictEqual(horarioIndisponivel(slot, 60, [], ...NAO_HOJE), false);
}

console.log('OK — regra de horário bate com a da RPC');

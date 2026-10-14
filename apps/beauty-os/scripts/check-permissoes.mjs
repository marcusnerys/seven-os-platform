import assert from 'node:assert';
import {
  podeUsar, podeAbrirAba, podeFazer, mensagemDaEquipe, normalizarCodigo, formatarCodigo,
} from '../node_modules/.tmp/permissoes.mjs';

const dono = { papel: 'dono', areas: [] };
const agenda = { papel: 'membro', areas: ['agenda'] };
const financeiro = { papel: 'membro', areas: ['financeiro'] };
const cobranca = { papel: 'membro', areas: ['cobranca'] };

// O dono usa tudo, mesmo sem áreas marcadas.
for (const area of ['agenda', 'clientes', 'financeiro', 'cobranca']) assert.ok(podeUsar(dono, area), area);
for (const aba of ['dashboard', 'agenda', 'clients', 'financial', 'more', 'automation']) assert.ok(podeAbrirAba(dono, aba), aba);

// Abas: Início e Mais são de todos; Clientes abre para agenda e cobrança, que precisam ver clientes.
assert.ok(podeAbrirAba(financeiro, 'dashboard'));
assert.ok(podeAbrirAba(financeiro, 'more'));
assert.ok(podeAbrirAba(financeiro, 'financial'));
assert.ok(!podeAbrirAba(financeiro, 'agenda'));
assert.ok(!podeAbrirAba(financeiro, 'clients'));
assert.ok(podeAbrirAba(agenda, 'clients'));
assert.ok(!podeAbrirAba(agenda, 'automation'), 'mensagens automáticas são do dono');
assert.ok(!podeAbrirAba(agenda, 'financial'));
assert.ok(podeAbrirAba(cobranca, 'clients'));
assert.ok(!podeAbrirAba(cobranca, 'agenda'));

// Voz: cada comando pede a área certa; os de consulta geral não pedem nenhuma.
// Voz: mesmas regras do banco.
assert.ok(podeFazer(cobranca, 'charge_pix'));
assert.ok(!podeFazer(agenda, 'charge_pix'));
assert.ok(!podeFazer(agenda, 'create_expense'));
assert.ok(podeFazer(agenda, 'create_client'), 'agenda cadastra cliente, como no botão +');
assert.ok(!podeFazer(cobranca, 'create_client'));
assert.ok(podeFazer(cobranca, 'search_client'), 'quem cobra procura cliente');
assert.ok(!podeFazer(financeiro, 'search_client'));
assert.ok(!podeFazer(agenda, 'delete_client'));
assert.ok(podeFazer(financeiro, 'get_daily_summary'));
assert.ok(podeFazer(financeiro, 'unknown'), 'sem regra: qualquer pessoa');
assert.ok(podeFazer(dono, 'delete_client'));

// Erros do banco viram frases.
assert.match(mensagemDaEquipe({ message: 'conta_com_dados' }), /já tem clientes/);
assert.match(mensagemDaEquipe(new Error('convite_invalido')), /não vale mais/);
assert.match(mensagemDaEquipe('qualquer outra coisa'), /Não deu certo/);

// Código digitado de qualquer jeito.
assert.strictEqual(normalizarCodigo(' abcde-23456 '), 'ABCDE23456');
assert.strictEqual(formatarCodigo('ABCDE23456'), 'ABCDE-23456');

console.log('OK — permissões da conta compartilhada');

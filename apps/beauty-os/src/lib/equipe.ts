/**
 * "Sua equipe": cada área do assistente tem nome e cargo. Por baixo é o
 * mesmo assistente que entende o comando e decide a área; o nome só aparece
 * na resposta ("Davi registrou sua despesa"). Pessoas confiam mais e perdoam
 * mais quando falam com alguém — e não custa nada.
 */
export type Membro = { nome: string; cargo: string; cor: string };

export const EQUIPE = {
  agenda: { nome: 'Lia', cargo: 'Secretária', cor: '#7B61FF' },
  financeiro: { nome: 'Davi', cargo: 'Financeiro', cor: '#2FB36B' },
  clientes: { nome: 'Clara', cargo: 'Relacionamento', cor: '#E8508A' },
  cobranca: { nome: 'Rui', cargo: 'Cobrança', cor: '#F07B3F' },
  geral: { nome: 'Leshanot', cargo: 'Sua equipe', cor: '#8E8E93' },
} satisfies Record<string, Membro>;

const POR_ACAO: Record<string, keyof typeof EQUIPE> = {
  create_appointment: 'agenda', cancel_appointment: 'agenda', send_whatsapp: 'agenda',
  create_revenue: 'financeiro', create_expense: 'financeiro', delete_transaction: 'financeiro',
  show_financial_summary: 'financeiro', get_daily_summary: 'financeiro',
  create_client: 'clientes', update_client_notes: 'clientes', update_client_vip: 'clientes',
  delete_client: 'clientes', search_client: 'clientes', list_inactive_clients: 'clientes', create_service: 'clientes',
  charge_pix: 'cobranca',
};

export const membroDaAcao = (acao: string): Membro => EQUIPE[POR_ACAO[acao] ?? 'geral'];

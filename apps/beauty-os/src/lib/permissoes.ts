/**
 * Conta compartilhada (migration 0022): cada pessoa da equipe vê só as áreas
 * que o dono liberou. O banco é quem barra de verdade (RLS); aqui o app só
 * esconde o que a pessoa não pode usar, para ela não esbarrar em tela vazia.
 */
export type Area = 'agenda' | 'clientes' | 'financeiro' | 'cobranca';
export type Papel = 'dono' | 'membro';

export const AREAS: Area[] = ['agenda', 'clientes', 'financeiro', 'cobranca'];

export const NOME_DA_AREA: Record<Area, string> = {
  agenda: 'Agenda',
  clientes: 'Clientes',
  financeiro: 'Financeiro',
  cobranca: 'Cobrança',
};

export const DESCRICAO_DA_AREA: Record<Area, string> = {
  agenda: 'Marca, remarca e conclui atendimentos; vê os clientes.',
  clientes: 'Cadastra, edita e exclui clientes; vê o histórico.',
  financeiro: 'Receitas, despesas, fixos, extratos e dízimo.',
  cobranca: 'Cobra clientes por PIX.',
};

export type Acesso = { papel: Papel; areas: Area[] };

export const podeUsar = (acesso: Acesso, area: Area) => acesso.papel === 'dono' || acesso.areas.includes(area);

/**
 * Abas e as áreas que liberam cada uma. Início e Mais são de todos. As
 * mensagens automáticas são configuração do negócio: só o dono (lista vazia).
 */
const AREAS_DA_ABA: Record<string, Area[]> = {
  agenda: ['agenda'],
  automation: [],
  clients: ['clientes', 'agenda', 'cobranca'],
  financial: ['financeiro'],
};

export const podeAbrirAba = (acesso: Acesso, aba: string) => {
  const areas = AREAS_DA_ABA[aba];
  return !areas || acesso.papel === 'dono' || areas.some(a => acesso.areas.includes(a));
};

/**
 * Ações da voz e as áreas que liberam cada uma (basta uma), iguais às regras
 * do banco: a agenda também cadastra cliente; quem cobra também procura.
 * Sem entrada: qualquer pessoa da equipe.
 */
const LER_CLIENTES: Area[] = ['clientes', 'agenda', 'cobranca'];
const GRAVAR_CLIENTES: Area[] = ['clientes', 'agenda'];
const AREAS_DA_ACAO: Record<string, Area[]> = {
  create_appointment: ['agenda'], cancel_appointment: ['agenda'], create_service: ['agenda'],
  send_whatsapp: LER_CLIENTES, search_client: LER_CLIENTES, list_inactive_clients: LER_CLIENTES,
  create_client: GRAVAR_CLIENTES, update_client_notes: GRAVAR_CLIENTES, update_client_vip: GRAVAR_CLIENTES,
  delete_client: ['clientes'],
  create_revenue: ['financeiro'], create_expense: ['financeiro'], delete_transaction: ['financeiro'],
  show_financial_summary: ['financeiro'], get_daily_summary: ['financeiro'],
  charge_pix: ['cobranca'],
};

export const areasDaAcao = (acao: string): Area[] | undefined => AREAS_DA_ACAO[acao];

export const podeFazer = (acesso: Acesso, acao: string) => {
  const areas = AREAS_DA_ACAO[acao];
  return !areas || areas.some(a => podeUsar(acesso, a));
};

/** Texto do erro do banco para quem está usando o app. */
export function mensagemDaEquipe(erro: unknown): string {
  const texto = String((erro as { message?: string })?.message ?? erro ?? '');
  const mensagens: Record<string, string> = {
    convite_invalido: 'Esse código não vale mais: ele já foi usado, expirou ou foi digitado errado.',
    conta_com_dados: 'Sua conta já tem clientes, agenda ou lançamentos. Para entrar numa equipe, use um e-mail novo.',
    conta_com_google: 'Sua conta está ligada ao Google Agenda. Desconecte em Mais → Ligar Agenda ao Calendário antes de entrar na equipe.',
    ja_na_equipe: 'Você já faz parte desta equipe.',
    ja_em_outra_equipe: 'Você já faz parte de outra equipe. Saia dela em Mais → Equipe antes de aceitar.',
    so_dono: 'Só quem é dono do negócio pode fazer isso.',
    areas_invalidas: 'Escolha pelo menos uma área.',
    convites_demais: 'Há convites demais em aberto. Cancele alguns antes de criar outro.',
    membro_nao_encontrado: 'Essa pessoa não está mais na equipe.',
    nao_e_membro: 'Você é o dono deste negócio e não pode sair dele.',
  };
  const chave = Object.keys(mensagens).find(k => texto.includes(k));
  return chave ? mensagens[chave] : 'Não deu certo. Verifique a internet e tente de novo.';
}

/** Código de convite guardado de um link (?convite=...) até a pessoa entrar. */
const CHAVE_CONVITE = 'leshanot-convite';

export const normalizarCodigo = (codigo: string) => codigo.toUpperCase().replace(/[^A-Z0-9]/g, '');

export function guardarConviteDoLink(): void {
  try {
    const codigo = new URLSearchParams(window.location.search).get('convite');
    if (!codigo) return;
    localStorage.setItem(CHAVE_CONVITE, normalizarCodigo(codigo));
    const url = new URL(window.location.href);
    url.searchParams.delete('convite');
    window.history.replaceState(null, '', url.toString());
  } catch {
    // Sem localStorage o convite ainda pode ser digitado em Mais → Equipe.
  }
}

export function conviteGuardado(): string | null {
  try { return localStorage.getItem(CHAVE_CONVITE); } catch { return null; }
}

export function esquecerConvite(): void {
  try { localStorage.removeItem(CHAVE_CONVITE); } catch { /* nada a fazer */ }
}

/** "ABCDE12345" vira "ABCDE-12345", mais fácil de ditar. */
export const formatarCodigo = (codigo: string) =>
  codigo.length === 10 ? `${codigo.slice(0, 5)}-${codigo.slice(5)}` : codigo;

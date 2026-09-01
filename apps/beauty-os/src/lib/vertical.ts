/**
 * Verticais de negócio suportadas.
 *
 * O app é o mesmo para todos os segmentos — só a terminologia visível muda.
 * Cada vertical define os rótulos usados nas telas e as categorias financeiras
 * sugeridas para aquele tipo de negócio.
 */

export type BusinessType = 'beauty' | 'auto' | 'personal' | 'generic';

export interface VerticalConfig {
  /** Nome da vertical mostrado na escolha do onboarding */
  label: string;
  /** Frase curta que ajuda o usuário a se identificar */
  tagline: string;
  /** Emoji usado no card de seleção */
  icon: string;
  /** Como o negócio se chama: "Estúdio", "Oficina"... */
  businessNoun: string;
  /** Rótulo do campo de nome: "Nome do Estúdio" */
  businessNameLabel: string;
  /** Placeholder do campo de nome */
  businessNamePlaceholder: string;
  /** Singular de quem é atendido */
  clientNoun: string;
  /** Plural de quem é atendido — usado na navegação */
  clientNounPlural: string;
  /** Singular do que é vendido/executado */
  serviceNoun: string;
  /** Plural do que é vendido/executado */
  serviceNounPlural: string;
  /** Categorias de despesa sugeridas */
  expenseCategories: string[];
  /** Categorias de receita sugeridas */
  revenueCategories: string[];
  /** Se false, as telas de Agenda/Clientes/Automação são escondidas */
  hasScheduling: boolean;
}

export const VERTICALS: Record<BusinessType, VerticalConfig> = {
  beauty: {
    label: 'Beleza e Estética',
    tagline: 'Salão, studio, barbearia, estética',
    icon: '💇',
    businessNoun: 'Estúdio',
    businessNameLabel: 'Nome do Estúdio',
    businessNamePlaceholder: 'Meu Studio',
    clientNoun: 'Cliente',
    clientNounPlural: 'Clientes',
    serviceNoun: 'Serviço',
    serviceNounPlural: 'Serviços',
    expenseCategories: ['Produtos', 'Aluguel', 'Energia', 'Marketing', 'Equipamentos', 'Impostos', 'Outros'],
    revenueCategories: ['Serviço', 'Venda de produto', 'Pacote', 'Outros'],
    hasScheduling: true,
  },
  auto: {
    label: 'Oficina e Mecânica',
    tagline: 'Auto center, funilaria, elétrica, borracharia',
    icon: '🔧',
    businessNoun: 'Oficina',
    businessNameLabel: 'Nome da Oficina',
    businessNamePlaceholder: 'Minha Oficina',
    clientNoun: 'Cliente',
    clientNounPlural: 'Clientes',
    serviceNoun: 'Serviço',
    serviceNounPlural: 'Serviços',
    expenseCategories: ['Peças', 'Ferramentas', 'Aluguel', 'Energia', 'Combustível', 'Impostos', 'Outros'],
    revenueCategories: ['Mão de obra', 'Venda de peça', 'Revisão', 'Outros'],
    hasScheduling: true,
  },
  personal: {
    label: 'Finanças Pessoais',
    tagline: 'Controle de gastos individual, sem clientes',
    icon: '💰',
    businessNoun: 'Perfil',
    businessNameLabel: 'Seu nome',
    businessNamePlaceholder: 'Meu controle',
    clientNoun: 'Contato',
    clientNounPlural: 'Contatos',
    serviceNoun: 'Categoria',
    serviceNounPlural: 'Categorias',
    expenseCategories: ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Outros'],
    revenueCategories: ['Salário', 'Freelance', 'Investimento', 'Outros'],
    hasScheduling: false,
  },
  generic: {
    label: 'Outro negócio',
    tagline: 'Comércio, prestação de serviço, autônomo',
    icon: '🏪',
    businessNoun: 'Negócio',
    businessNameLabel: 'Nome do Negócio',
    businessNamePlaceholder: 'Meu Negócio',
    clientNoun: 'Cliente',
    clientNounPlural: 'Clientes',
    serviceNoun: 'Serviço',
    serviceNounPlural: 'Serviços',
    expenseCategories: ['Fornecedores', 'Aluguel', 'Energia', 'Marketing', 'Impostos', 'Outros'],
    revenueCategories: ['Venda', 'Serviço', 'Outros'],
    hasScheduling: true,
  },
};

export const BUSINESS_TYPES = Object.keys(VERTICALS) as BusinessType[];

/** Nunca retorna undefined — cai em `generic` se o valor salvo for inválido. */
export function getVertical(type: string | undefined | null): VerticalConfig {
  return VERTICALS[type as BusinessType] ?? VERTICALS.generic;
}

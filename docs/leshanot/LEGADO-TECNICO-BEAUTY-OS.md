# Legado Técnico — Leshanot Beauty OS

**Data:** 2026-08-20
**Autor:** Claude (sessão autônoma noturna)
**Repositório:** `marcusnerys/seven-os-platform`
**Branch:** `claude/leshanot-beauty-os-context-h4esea`
**Diretório do produto:** `apps/beauty-os/`

Este documento existe para que qualquer pessoa — você ou outro desenvolvedor — consiga entender exatamente o que existe hoje, por que foi feito assim, e o que fazer a seguir, sem precisar reconstruir esse raciocínio do zero.

Documentos relacionados, na mesma pasta `docs/superpowers/`:
- `specs/2026-08-20-leshanot-beauty-os-design.md` — o design aprovado antes de qualquer código
- `plans/2026-08-20-leshanot-beauty-os-fase1-migracao.md` — o plano de implementação task-a-task que foi executado

---

## 1. Visão geral do projeto

### O que é

Leshanot Beauty OS é o piloto comercial de um software de gestão para negócios de beleza (lash designers, nail designers, salões, studios de estética). O objetivo imediato é colocar uma ferramenta funcional nas mãos de **20 negócios reais** para validar o produto antes de definir preços e planos finais.

### Como chegamos aqui

Já existia um protótipo avançado, o **Leshanot Studio**, construído fora deste repositório (React + Firebase, gerado via Google AI Studio). Nesta sessão, esse protótipo foi:

1. Trazido para dentro do repositório `seven-os-platform`, em `apps/beauty-os/`
2. Migrado de Firebase para **Supabase** (banco Postgres + Auth + Realtime)
3. Preparado para publicação como **PWA na Vercel** (em vez de app nativo de loja)
4. Revisado em segurança e qualidade de código, com correções aplicadas

### Quem usa

- **Dono do negócio de beleza** (a "empresa" no sistema) — se cadastra, gerencia agenda/clientes/financeiro
- **Cliente final** — agenda um horário publicamente, sem precisar de conta, através de um link único por negócio

### Módulos existentes

| Módulo | Tela | O que faz |
|---|---|---|
| Dashboard | `src/screens/Dashboard.tsx` | KPIs (faturamento, atendimentos), gráficos, agenda do dia |
| Agenda | `src/screens/Agenda.tsx` | Agendamentos, detecção de conflito de horário |
| Clientes | `src/screens/Clients.tsx` | CRM básico — histórico, tags, VIP, favoritos |
| Financeiro | `src/screens/Financial.tsx` | Receitas/despesas, categorização |
| Serviços/Config | `src/screens/More.tsx` | Catálogo de serviços, configurações do estúdio, logout |
| Automação | `src/screens/Automation.tsx` | Templates de mensagem WhatsApp (boas-vindas, lembrete, aniversário...) |
| Agendamento público | `src/screens/BookingPage.tsx` | Página pública (sem login) onde o cliente final marca um horário |
| Login/Cadastro | `src/screens/Login.tsx` | Autenticação por e-mail/senha |
| Assistente de voz | `src/components/VoiceAssistant.tsx` + `src/services/voiceService.ts` | Comandos de voz interpretados por IA (Gemini) |
| DevTools | `src/screens/DevTools.tsx` | Painel de QA interno — seed de dados de teste, testes automatizados |

### Stack tecnológica

| Camada | Tecnologia | Versão |
|---|---|---|
| Frontend | React + TypeScript | 19.0.1 / 5.8 |
| Build | Vite | 6.4.2 |
| Estilo | Tailwind CSS | 4.1.14 |
| Estado | Zustand | 5.0.13 |
| Roteamento | react-router-dom | 7.15.1 |
| Gráficos | Recharts | 3.8.1 |
| Animação | Motion (Framer Motion) | 12.23 |
| PWA | vite-plugin-pwa | 1.3.0 |
| **Backend** | **Supabase** (Postgres 17 + Auth + Realtime) | via `@supabase/supabase-js` 2.112.3 |
| IA | Google GenAI SDK (Gemini 1.5 Flash) | `@google/genai` 1.29.0 |
| Deploy alvo | Vercel (PWA + função serverless) | — |

---

## 2. Mapeamento completo da estrutura

```
apps/beauty-os/
├── api/
│   └── voice/
│       └── parse.ts              # Função serverless da Vercel — substitui o antigo server.ts Express
├── src/
│   ├── main.tsx                  # Entry point React
│   ├── App.tsx                   # Roteador principal (rotas autenticadas + /book/:userId pública)
│   ├── index.css                 # Tailwind
│   ├── assets/                   # Ícones e imagens
│   ├── components/
│   │   ├── AutomationService.tsx # Motor que dispara as mensagens de automação
│   │   ├── BottomNav.tsx         # Navegação inferior (estilo iOS)
│   │   ├── Logo.tsx
│   │   ├── UI.tsx                # Componentes atômicos (Card, Button, Modal, Toast...)
│   │   └── VoiceAssistant.tsx    # Modal do assistente de voz
│   ├── lib/
│   │   ├── supabase.ts           # ★ NOVO — client Supabase + helper de erro
│   │   ├── store.ts              # ★ REESCRITO — Zustand: todo estado global + todas as operações de dados
│   │   ├── testData.ts           # ★ REESCRITO — seed/limpeza de dados de teste (usa Supabase)
│   │   ├── utils.ts               # Formatação de moeda, datas, classes CSS
│   │   ├── whatsapp.ts            # Geração de links wa.me
│   │   └── qa/
│   │       ├── logger.ts
│   │       ├── performance.ts
│   │       ├── testRunner.ts     # ★ MODIFICADO — smoke tests automatizados (usa Supabase)
│   │       └── types.ts
│   ├── screens/                  # Uma tela por rota — ver tabela de módulos acima
│   └── services/
│       └── voiceService.ts       # Parser de intenção de voz + executor de comandos (chama /api/voice/parse)
├── supabase/
│   └── migrations/               # ★ NOVO — histórico de mudanças no banco (ver seção 3)
│       ├── 0001_initial_schema.sql
│       ├── 0002_public_booking_access.sql
│       ├── 0003_fix_public_read_scoping.sql
│       └── 0004_fix_public_slots_scoping.sql
├── package.json                  # ★ REESCRITO — sem firebase/express/dotenv
├── tsconfig.json                 # ★ MODIFICADO — tipos do vite/client
├── vercel.json                   # ★ NOVO — config de build da Vercel
├── vite.config.ts                # PWA (manifest, service worker), alias @/
├── .env.example                  # Variáveis necessárias (documentação)
├── .env                          # Variáveis reais — NÃO commitado (gitignored)
└── README.md                     # ★ NOVO — instruções rápidas de dev/deploy
```

### O que foi removido

- `src/lib/firebase.ts` — client Firebase (substituído por `src/lib/supabase.ts`)
- `server.ts` — servidor Express standalone (substituído por `api/voice/parse.ts`, função serverless)
- `firebase-applet-config.json`, `firebase-blueprint.json`, `firestore.rules` — artefatos específicos do Firebase/AI Studio, sem uso na stack nova
- Dependências: `firebase`, `express`, `@types/express`, `dotenv`, `@firebase/eslint-plugin-security-rules`

### Estado global (`src/lib/store.ts`)

Tudo passa por uma única store Zustand (`useStore`). Ela guarda:
- `user` (sessão Supabase Auth)
- `clients`, `appointments`, `transactions`, `services`, `notifications`, `automationTemplates`, `settings`
- Ações de UI (`activeTab`, `modalToOpen`, `toast`, etc.)

Cada entidade tem `add`/`update`/`delete` que chamam o Supabase diretamente, e um listener Realtime (`startListeners`) que resincroniza a UI automaticamente quando algo muda no banco — sem precisar dar refresh.

**Ponto de atenção para quem for mexer aqui:** as colunas do banco são `snake_case` (`is_vip`, `last_visit`) mas as interfaces TypeScript usadas pela UI são `camelCase` (`isVIP`, `lastVisit`). A conversão é feita manualmente pelas funções `toSnakeCaseClient`/`fromSnakeCaseClient` (e equivalentes para appointment/transaction/automation/notification) no topo do arquivo. Se adicionar um campo novo em alguma entidade, ele precisa ser adicionado nos dois lados dessa conversão, ou fica silenciosamente perdido.

### Variáveis de ambiente

| Variável | Onde é usada | Segura para expor no client? |
|---|---|---|
| `VITE_SUPABASE_URL` | `src/lib/supabase.ts` | Sim — URL pública do projeto |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabase.ts` | Sim — chave pública por design do Supabase, protegida pelas políticas RLS do banco, não pela chave em si |
| `GEMINI_API_KEY` | `api/voice/parse.ts` (**só no servidor**) | **Não** — nunca deve ter prefixo `VITE_`, senão vaza no bundle do navegador |

---

## 3. Arquitetura de backend (Supabase)

### Projeto Supabase usado

- **Nome:** "SEVEN OS"
- **ID:** `filoacckewinytzdlzfg`
- **Região:** `sa-east-1` (São Paulo)
- **Organização:** `marcusnerys's Org`
- Estava **pausado** (plano free autopausa por inatividade) — foi reativado nesta sessão via `mcp__Supabase__restore_project`.

### ⚠️ Achado importante: schema CORE já existente

Esse projeto Supabase **já continha um schema muito mais maduro** do que o que este piloto criou: `units`, `profiles` (com papéis: admin/manager/receptionist/professional/cashier/concierge), `clients`, `staff`, `services`, `appointments`, `service_sessions`, `products`, `consumptions`, `payments`, `commissions`, `external_services`, `crm_actions`, `notifications`, `analytics_events`, `audit_logs`, `operational_events`, `client_history_entries`, `app_config`.

Isso parece ser o **CORE real do Seven OS Platform** — já cobre multi-unidade, múltiplos usuários por negócio com papéis, e até **Profissionais e Comissões**, que seriam a Fase 2 deste piloto.

**Decisão tomada:** para não colidir nem sobrescrever esse trabalho (que pode já estar em uso ou ser fundação de outro esforço), todas as tabelas do piloto Beauty OS usam o prefixo `beautyos_`. As duas estruturas coexistem no mesmo projeto sem se tocar.

**Recomendação para o futuro:** vale uma decisão explícita — consolidar o Beauty OS em cima do schema CORE (`units`/`profiles`/`staff`) em vez de manter duas estruturas paralelas. Isso herdaria de graça o suporte a equipe/comissões que a Fase 2 do piloto ainda não tem.

### Tabelas do piloto (`beautyos_*`)

Todas em `public`, todas com Row Level Security (RLS) habilitado.

| Tabela | Campos principais | Relaciona com |
|---|---|---|
| `beautyos_empresas` | `id` (= `auth.users.id`), `nome`, `plano` | raiz — todas as outras referenciam `empresa_id` |
| `beautyos_clients` | `name`, `phone`, `spent`, `visits`, `is_vip`, `tags[]` | `empresa_id` |
| `beautyos_services` | `name`, `price`, `duration` | `empresa_id` |
| `beautyos_appointments` | `client_id`, `service`, `date`, `time`, `status`, `price` | `empresa_id`, `client_id` |
| `beautyos_transactions` | `amount`, `type` (revenue/expense), `category`, `date` | `empresa_id` |
| `beautyos_automation_templates` | `type`, `title`, `message`, `is_active` | `empresa_id` |
| `beautyos_automation_logs` | `id` (chave da mensagem), `sent_at` | `empresa_id` |
| `beautyos_notifications` | `title`, `message`, `type`, `read` | `empresa_id` |
| `beautyos_settings` | `studio_name`, `location`, `currency` | `empresa_id` (1 linha por empresa) |

### Modelo de multi-tenant: `empresa_id = auth.uid()`

Nesta fase do piloto, **1 usuário autenticado = 1 empresa**, direto. Não existe ainda conceito de "equipe com vários logins por negócio" (isso é o que o schema CORE já resolveria, se for adotado depois).

Um **trigger** (`handle_new_beautyos_user`, disparado em `auth.users` após INSERT) cria automaticamente a linha em `beautyos_empresas` e `beautyos_settings` no momento do cadastro — sem isso, o primeiro `insert` em qualquer tabela do usuário falharia por violação de chave estrangeira.

### Políticas de segurança (RLS)

Regra geral, em todas as tabelas: `empresa_id = auth.uid()` — cada usuário só enxerga e altera os próprios dados. Isso é reforçado no **banco**, não só no código do app — mesmo que alguém chame a API do Supabase diretamente (fora do app), a política impede acesso cruzado entre negócios.

**Exceção deliberada — agendamento público:** a página `BookingPage.tsx` roda sem login (o cliente final não tem conta). Para isso funcionar, existem 3 funções especiais que **não** seguem a regra geral, criadas via `security definer` e chamadas por `supabase.rpc(...)` em vez de query direta na tabela:

| Função RPC | O que retorna | Por que existe |
|---|---|---|
| `beautyos_public_services(p_empresa_id)` | catálogo de serviços de **uma** empresa específica | mostrar preços na página de agendamento |
| `beautyos_public_settings(p_empresa_id)` | nome/local/moeda de **uma** empresa específica | mostrar o nome do estúdio na página |
| `beautyos_public_slots(p_empresa_id, p_date)` | só horário/duração dos agendamentos não cancelados de **uma** empresa, numa data | verificar conflito de horário sem expor nome/telefone do cliente |

Essas 3 funções são o resultado de uma correção de segurança — ver seção 5.

### Realtime

As tabelas `beautyos_clients`, `beautyos_appointments`, `beautyos_transactions`, `beautyos_notifications` (e as demais listadas na migration 0001) estão na publicação `supabase_realtime`. O `store.ts` se inscreve nelas via `supabase.channel(...)` — quando um dado muda no banco (por qualquer via), a tela atualiza sozinha.

### Custos e pontos de atenção

- Projeto no plano free do Supabase — **pausa automaticamente por inatividade**. Se ninguém usar por um tempo, será preciso reativar de novo (`mcp__Supabase__restore_project` ou pelo painel).
- `api/voice/parse.ts` chama a API paga do Gemini a cada uso do assistente de voz — ver risco de custo na seção 8.

---

## 4. O que foi migrado e por quê (Firebase → Supabase)

| Antes (Firebase) | Depois (Supabase) | Motivo |
|---|---|---|
| Firestore (`users/{uid}/clients`, etc. — subcoleções por usuário) | Postgres com `empresa_id` em cada linha + RLS | Modelo relacional dá controle de schema, índices e RLS no nível do banco; mais barato de escalar para múltiplos negócios |
| Firebase Auth (`onAuthStateChanged`) | Supabase Auth (`supabase.auth.onAuthStateChange`) | Pedido explícito do usuário — repositório já usa Supabase em outras partes (Flutter) |
| `onSnapshot` (listener Firestore) | Supabase Realtime channels (`postgres_changes`) | Equivalente direto |
| Login com Google + e-mail/senha | Só e-mail/senha nesta fase | OAuth do Google no Supabase exige configuração de provedor separada — **fora do escopo desta migração**, botão removido da tela de login |
| Servidor Express (`server.ts`, porta 3000) | Função serverless (`api/voice/parse.ts`) | Vercel não roda servidor long-running; função serverless é o padrão da plataforma |
| Deploy pensado para Google AI Studio / Cloud Run | PWA na Vercel | Decisão de produto — ver spec de design |

---

## 5. Segurança — o que foi encontrado e corrigido

Depois de terminar a migração, rodei uma revisão de segurança (`security-review`) e uma revisão de código (`code-review`) de verdade sobre o próprio trabalho — não foi só uma checagem superficial.

### Achado 1 (CONFIRMADO, corrigido) — vazamento de dados entre negócios via `services`/`settings`

**O que era:** as políticas RLS criadas para permitir a página pública de agendamento usavam `using (true)` — ou seja, "qualquer um pode ler". Isso valia para **todas** as linhas da tabela, não só a do negócio sendo visitado.

**Impacto real:** qualquer pessoa com a chave pública do app (que fica exposta no navegador, é normal) podia chamar a API do Supabase diretamente e baixar o catálogo de preços e o nome/localização de **todos os 20 negócios do piloto de uma vez**, não só do que estava visitando.

**Correção:** as políticas `using (true)` foram removidas. No lugar, duas funções RPC (`beautyos_public_services`, `beautyos_public_settings`) só devolvem dados da **empresa específica** passada como parâmetro. Ver migration `0003_fix_public_read_scoping.sql`.

### Achado 2 (CONFIRMADO, corrigido) — mesma classe de problema na agenda pública

**O que era:** a *view* `beautyos_public_slots` (criada para mostrar horários ocupados sem expor dados do cliente) não respeitava a política RLS da tabela `beautyos_appointments`, porque views no Postgres rodam com o privilégio de quem as criou, não de quem consulta — então a mesma falha de "vaza tudo, não só de uma empresa" existia aqui também, mesmo sem dados de cliente envolvidos (só data/hora/duração, mas ainda assim a agenda completa de todos os negócios).

**Correção:** a view foi trocada por uma função RPC (`beautyos_public_slots(p_empresa_id, p_date)`), escopada. Ver migration `0004_fix_public_slots_scoping.sql`.

### Achado 3 (corrigido) — bug de mutação de array em `Automation.tsx`

`templates.sort(...)` estava ordenando o array **direto na store do Zustand**, por referência, durante a renderização — um efeito colateral que pode causar comportamento inconsistente entre re-renders. Trocado por `[...templates].sort(...)` (ordena uma cópia).

### Risco aceito, não corrigido — `/api/voice/parse` sem autenticação

O endpoint do assistente de voz não verifica quem está chamando nem tem limite de uso. Isso é o mesmo comportamento do `server.ts` original (não é uma regressão desta migração), mas significa que, uma vez publicada a URL da Vercel, qualquer pessoa que a descobrir pode gerar chamadas pagas na chave do Gemini. **Recomendo endurecer isso** (verificar um JWT do Supabase antes de processar) antes de divulgar a URL amplamente — não é urgente para um piloto fechado com 20 pessoas, mas é uma exposição real.

### `npm audit`

Antes: 11 vulnerabilidades (8 altas) — principalmente em `react-router`, `vite`/`ws` (dependências de desenvolvimento). Depois de `npm audit fix`: **0 vulnerabilidades**.

---

## 6. Manual de manutenção

### Instalar e rodar localmente

```bash
cd apps/beauty-os
npm install
cp .env.example .env
# preencher VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, GEMINI_API_KEY no .env
npm run dev
```

Credenciais reais do Supabase (projeto "SEVEN OS", já provisionado):
```
VITE_SUPABASE_URL=https://filoacckewinytzdlzfg.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_WHihue5Ok9sceNq7smm42Q_m_umXl-P
```
(`GEMINI_API_KEY` precisa de uma chave real do Google AI Studio — não incluída aqui por ser secreta.)

### Rodar verificação de tipos e build de produção

```bash
npm run lint     # tsc --noEmit
npm run build    # tsc --noEmit && vite build
```

### Aplicar uma nova alteração no banco (migration)

Não existe pipeline automatizado ainda. O processo usado nesta sessão foi manual, via ferramenta MCP do Supabase (`mcp__Supabase__apply_migration`), com o SQL também salvo em `apps/beauty-os/supabase/migrations/000N_nome.sql` para rastreabilidade. Ao criar uma tabela nova, lembrar de:
1. Habilitar RLS (`alter table ... enable row level security`)
2. Criar a política de isolamento por `empresa_id = auth.uid()`
3. Adicionar a tabela à publicação `supabase_realtime` se a UI precisar de atualização em tempo real

### Deploy

Ver seção 7 — build está pronto (`vercel.json` configurado), mas **o deploy real na Vercel ainda não foi feito** (ver seção 9).

### Investigar um erro em produção

- Erros de banco/RLS: painel do Supabase → Logs, ou `mcp__Supabase__get_logs` / `get_advisors`
- Erros de frontend: console do navegador — `handleSupabaseError` (em `src/lib/supabase.ts`) loga todo erro de operação de dados como JSON estruturado antes de propagar

---

## 7. Checklist antes do deploy

- [x] O projeto compila (`tsc --noEmit` limpo)
- [x] Build de produção funciona (`vite build` gera `dist/` com service worker PWA)
- [x] Não existem credenciais expostas no código commitado (`.env` está no `.gitignore`)
- [x] Variáveis de ambiente identificadas e documentadas (`.env.example`)
- [x] Banco de dados protegido (RLS habilitado em todas as tabelas)
- [x] Regras de segurança validadas (revisão de segurança rodada, 2 achados corrigidos)
- [ ] Backup do banco — **não configurado ainda**; plano free do Supabase não tem backup automático point-in-time
- [x] Impacto financeiro considerado — ver risco do endpoint de voz (seção 5)
- [ ] Ambiente de produção — **deploy ainda não realizado**
- [ ] Estratégia de rollback — **não definida** (não há deploy ainda para reverter)
- [ ] Aprovação do responsável para publicar — pendente de você

---

## 8. Matriz de riscos

| Risco | Severidade | Prevenção | Detecção | Recuperação |
|---|---|---|---|---|
| Custo elevado via `/api/voice/parse` sem autenticação | Médio | Adicionar verificação de JWT do Supabase antes de chamar o Gemini | Monitorar uso/cobrança no painel do Google AI Studio | Revogar a `GEMINI_API_KEY` e gerar uma nova; adicionar auth antes de reativar |
| Duas estruturas de banco coexistindo (`beautyos_*` vs. schema CORE `units`/`profiles`) | Médio | Decidir explicitamente se/quando consolidar | Revisão manual do schema (`list_tables`) | Migração de dados entre schemas, planejada — não é reversão automática |
| Projeto Supabase pausa por inatividade (plano free) | Baixo | Nenhuma automática — monitorar uso | App para de responder, erro de conexão | `mcp__Supabase__restore_project` ou reativar pelo painel |
| Ausência de backup do banco | Médio | Fazer backup manual periódico via `pg_dump` ou upgrade de plano Supabase | — | Sem backup, perda de dados do piloto é irrecuperável |
| Deploy ainda não realizado | Alto (bloqueia o piloto) | — | — | Seguir seção 9 abaixo |
| `Login com Google` removido sem substituto | Baixo | Nenhuma — decisão deliberada de escopo | Usuário tenta logar com Google e não encontra o botão | Configurar provedor OAuth no Supabase quando houver demanda |

---

## 9. Status do deploy e próximos passos

### O que está pronto

- Código 100% migrado, buildando limpo, testado localmente (`tsc` + `vite build`)
- `vercel.json` configurado (`framework: vite`, `outputDirectory: dist`)
- Schema do banco todo aplicado e funcionando no Supabase de produção

### O que falta — deploy real

**Ainda não publicado na Vercel.** Duas tentativas de autenticar via token de API da Vercel (fornecidos pelo usuário) falharam — a própria API da Vercel respondeu `404 User not found` para ambos os tokens, mesmo testando direto via `curl`, fora do CLI. Causa não identificada com certeza (suspeita de problema na cópia do token pelo celular), mas **confirmado que não é problema do código ou da configuração deste projeto**.

**Caminho recomendado agora — deploy manual pelo painel:**
1. [vercel.com/new](https://vercel.com/new) → importar `marcusnerys/seven-os-platform`
2. **Root Directory** → `apps/beauty-os`
3. Variáveis de ambiente:
   - `VITE_SUPABASE_URL=https://filoacckewinytzdlzfg.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=sb_publishable_WHihue5Ok9sceNq7smm42Q_m_umXl-P`
   - `GEMINI_API_KEY=<chave real>`
4. Deploy

**Caminho alternativo — CLI, se quiser tentar de novo:** o CLI da Vercel (`npx vercel`) está disponível nesta sessão via o plugin `vercel/vercel-plugin` instalado. Basta um token válido:
```bash
cd apps/beauty-os
npx vercel link --token <TOKEN> --scope team_YsX67ZEoj57HmAAsKvlaBLwx
npx vercel env add VITE_SUPABASE_URL production --token <TOKEN>
npx vercel env add VITE_SUPABASE_ANON_KEY production --token <TOKEN>
npx vercel env add GEMINI_API_KEY production --token <TOKEN>
npx vercel deploy --prod --token <TOKEN>
```

### O que falta — Fase 2 do produto

Ainda não iniciada: **Profissionais/Equipe, Comissões, CRM de Retorno, Relatórios avançados** — definidos no spec original, mas dependentes da decisão sobre consolidar ou não com o schema CORE já existente (`units`/`staff`/`commissions`) antes de começar a construir em cima do `beautyos_*` isolado.

### Histórico de commits desta sessão

Branch `claude/leshanot-beauty-os-context-h4esea`, do plano até a correção final de segurança:

```
dd76aa0 docs: add Fase 1 implementation plan
e938289 chore(beauty-os): scaffold Leshanot Studio source as baseline
9429533 feat(beauty-os): add multi-tenant Supabase schema with RLS
e885399 feat(beauty-os): migrate Firebase to Supabase across the full app
955c5fe feat(beauty-os): replace Express server with Vercel serverless function
76e2d09 fix(beauty-os): scope public booking reads to a single empresa_id
68c20e0 fix(beauty-os): close remaining code-review findings
9be28ad chore(beauty-os): npm audit fix — 0 vulnerabilities remaining
```

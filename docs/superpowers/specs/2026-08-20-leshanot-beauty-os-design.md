# Leshanot Beauty OS — Design de Migração e Expansão

**Data:** 2026-08-20
**Status:** Aprovado para planejamento de implementação
**Fase do produto:** Piloto comercial com 20 negócios de beleza

---

## 1. Contexto

O Leshanot Beauty OS é o primeiro produto vertical construído sobre o CORE Leshanot — uma plataforma de gestão para profissionais e negócios de beleza (lash designers, nail designers, salões, studios, esteticistas). O objetivo imediato não é lançar um produto final, mas colocar uma ferramenta funcional nas mãos de **20 negócios reais** para validar aderência, coletar feedback e só então definir os planos comerciais (Start/Pro/Premium) e o modelo de preço.

Já existe um protótipo funcional avançado, o **Leshanot Studio**, construído em React + Firebase + Gemini AI, cobrindo Dashboard, Agenda, CRM de Clientes, Financeiro, Automação de marketing (WhatsApp) e uma página pública de agendamento (Booking). Este spec define como evoluir esse protótipo para o produto piloto.

---

## 2. Decisão de stack

| Camada | Antes (protótipo) | Depois (piloto) |
|---|---|---|
| Frontend | React 19 + Vite | Mantido (React 19 + Vite) |
| Backend/DB | Firebase Firestore | **Supabase** (Postgres + Auth + Realtime) |
| Hospedagem | — | **Vercel**, como PWA instalável |
| IA de voz | Express + Gemini (`server.ts`) | Função serverless da Vercel + Gemini |

**Por que essa combinação:**
- Reaproveita o código React já funcional em vez de reconstruir do zero em outra stack (ex: Flutter)
- PWA na Vercel funciona em iOS e Android via navegador ("Adicionar à tela inicial"), sem passar por App Store/Play Store — essencial para testar rápido com 20 pessoas
- Supabase (Postgres) dá controle de schema, Row Level Security e SQL direto — mais adequado para multi-tenant do que Firestore

**Fora de escopo agora:** app nativo Flutter (App Store/Play Store). Fica como possibilidade futura, pós-validação, não faz parte deste piloto.

---

## 3. Multi-tenancy (arquitetura CORE)

Um único projeto Supabase atende todos os 20 negócios do piloto — e, depois, todos os clientes pagantes. Isso é a base do CORE Leshanot reutilizável mencionado no documento de produto original.

- Tabela raiz `empresas` (id, nome, plano, criado_em)
- Toda tabela de domínio carrega `empresa_id`
- Row Level Security (RLS) no Postgres garante que cada usuário só acessa dados da própria empresa
- Autenticação via Supabase Auth (e-mail/senha ou magic link), substituindo Firebase Auth

---

## 4. Modelo de dados

### 4.1 Entidades existentes (migradas do Firestore, mesma forma lógica)

```
clients (id, empresa_id, name, email, phone, spent, visits, last_visit,
         birth_date, tags[], is_vip, is_favorite, notes)

appointments (id, empresa_id, client_id, service, time, date, duration,
              status, price, notes, profissional_id*)  *novo campo

transactions (id, empresa_id, amount, type, category, date, description)

services (id, empresa_id, name, price, duration)

automation_templates (id, empresa_id, title, message, is_active, type)

notifications (id, empresa_id, title, message, type, read, created_at)
```

### 4.2 Entidades novas (Fase 2 — ver seção 6)

```
profissionais (id, empresa_id, nome, contato, funcao, comissao_padrao_pct, ativo)

comissoes (id, empresa_id, profissional_id, appointment_id, valor_servico,
           percentual, valor_comissao, status_pagamento)
```

### 4.3 CRM de Retorno — sem tabela nova

Calculado via view/query: `last_visit + intervalo_medio_do_servico = data_estimada_retorno`. Não precisa de tabela dedicada — é uma projeção sobre `clients` + `appointments` + `services`.

### 4.4 Relatórios avançados — sem tabela nova

Views agregadas no Postgres (por período, por serviço, por profissional), consumidas pelos gráficos Recharts que já existem no Dashboard.

---

## 5. Migração técnica (Fase 1)

- `src/lib/firebase.ts` → `src/lib/supabase.ts` (cliente Supabase)
- `src/lib/store.ts`: ações Zustand trocam chamadas Firestore por Supabase client, mantendo as mesmas interfaces TypeScript (`Client`, `Appointment`, `Transaction`, `Service`, etc.)
- `onSnapshot` (Firestore realtime) → Supabase Realtime channels
- `server.ts` (Express standalone) → função serverless/API route da Vercel, mesma lógica de parsing de voz via Gemini
- Manter 100% da UI e UX atuais nesta fase — o objetivo é trocar a fundação sem quebrar o que já funciona

**Critério de saída da Fase 1:** app publicado como PWA na Vercel, autenticando via Supabase, com todos os módulos atuais (Dashboard, Agenda, Clientes, Financeiro, Automação, Booking) funcionando de ponta a ponta sobre a nova stack.

---

## 6. Expansão de módulos (Fase 2)

Só começa depois que a Fase 1 estiver validada (app rodando estável na nova stack).

1. **Profissionais/Equipe** — cadastro, vínculo com agendamentos, funciona tanto para profissional individual quanto para studio com equipe
2. **Comissões** — cálculo automático por atendimento, regra configurável (% por profissional ou por serviço)
3. **CRM de Retorno** — indicador "cliente próximo do retorno" na tela de Clientes/Dashboard
4. **Relatórios avançados** — por período, serviço e profissional

**Por que fasear:** migrar a stack inteira e adicionar 4 módulos simultaneamente multiplica o risco de quebrar o que já está validado. Separar em duas fases isola o risco técnico (migração) do risco de produto (novas features).

---

## 7. Segurança

- `security-review` roda sobre as políticas RLS do Supabase e as rotas serverless antes do piloto ir ao ar
- `code-review` roda sobre cada PR de migração e de novo módulo antes do merge
- Chaves sensíveis (Gemini API key, Supabase service role) nunca expostas no client — apenas nas funções serverless

---

## 8. Fluxo de execução (agentes)

Após o plano de implementação estar escrito:

| Papel | Execução |
|---|---|
| Coordenação | Esta sessão (revisão e integração de cada entrega) |
| Implementação (lógica/funcionalidade) | Subagente segue o plano de implementação tarefa por tarefa |
| Design/UI dos novos módulos | Subagente com foco em frontend, mantendo o design system iOS-inspired já existente |
| Segurança | Skills `security-review` + `code-review` sobre cada diff |
| Marketing (material de lançamento) | Entregável à parte, não bloqueia o código — pode começar em paralelo |
| Vendas (playbook para a Daiane) | Entregável à parte, baseado no roteiro de diagnóstico comercial já definido no documento de produto original |

---

## 9. Fora de escopo deste spec

- Definição final de preços dos planos Start/Pro/Premium (depende do feedback dos 20 testadores)
- App nativo Flutter para lojas
- White-label / personalização avançada (Premium)
- RENTAL OS, SERVICE OS e outros verticais futuros

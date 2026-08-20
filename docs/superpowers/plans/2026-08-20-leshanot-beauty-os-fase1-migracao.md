# Leshanot Beauty OS — Fase 1: Migração Firebase→Supabase + Deploy PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar o protótipo Leshanot Studio (React 19 + Vite + Firebase) para Supabase multi-tenant, remover o servidor Express, e deixá-lo pronto para deploy como PWA na Vercel — sem quebrar nenhum dos módulos existentes (Dashboard, Agenda, Clientes, Financeiro, Automação, Booking).

**Architecture:** O app React vive em `apps/beauty-os/` dentro do repo (a raiz continua reservada para o CORE Flutter, hoje apenas scaffolding sem código em `lib/`). Substitui-se `src/lib/firebase.ts` por `src/lib/supabase.ts` e reescreve-se cada operação de `src/lib/store.ts` para usar o client Supabase (Postgres + Realtime + Auth) em vez do Firestore SDK. Multi-tenancy via `empresa_id = auth.uid()` (1:1 dono↔empresa nesta fase — convite de equipe fica para depois). O endpoint `/api/voice/parse` migra de Express standalone para uma função serverless da Vercel.

**Tech Stack:** React 19, Vite 6, TypeScript 5.8, Zustand 5, Supabase (`@supabase/supabase-js`), Tailwind CSS 4, `vite-plugin-pwa`, Vercel (hosting + serverless functions), Google GenAI SDK (`@google/genai`).

**Spec:** `docs/superpowers/specs/2026-08-20-leshanot-beauty-os-design.md`

## Global Constraints

- Nenhuma chave secreta (Supabase service role, Gemini API key) pode aparecer no bundle do client — só em funções serverless (variáveis de ambiente sem prefixo `VITE_`)
- Todas as tabelas de domínio carregam `empresa_id` e têm RLS habilitado — nenhuma tabela pode ficar acessível sem policy
- As interfaces TypeScript existentes (`Client`, `Appointment`, `Transaction`, `Service`, `AutomationTemplate`, `Notification`, `Settings`) definidas em `src/lib/store.ts` não mudam de forma — apenas a camada de persistência muda
- Build (`npm run build`) e typecheck (`npm run lint`, que roda `tsc --noEmit`) precisam passar limpos ao final de cada task que toca código
- Node.js runtime das funções serverless: Node 20 (padrão atual da Vercel)

---

## File Structure

```
apps/beauty-os/                      # novo — todo o código React vive aqui
├── api/
│   └── voice/
│       └── parse.ts                 # novo — função serverless Vercel (substitui server.ts)
├── src/
│   ├── lib/
│   │   ├── supabase.ts              # novo — client Supabase (substitui firebase.ts)
│   │   ├── firebase.ts              # removido
│   │   └── store.ts                 # modificado — Firestore → Supabase
│   ├── screens/
│   │   └── Login.tsx                # modificado — Firebase Auth → Supabase Auth
│   └── ... (demais arquivos copiados sem alteração estrutural)
├── supabase/
│   └── migrations/
│       └── 0001_initial_schema.sql  # novo — schema + RLS
├── package.json                     # modificado — remove firebase/express, adiciona @supabase/supabase-js
├── vercel.json                      # novo — config de build/rotas da Vercel
└── .env.example                     # modificado — variáveis Supabase em vez de Firebase
```

---

### Task 1: Scaffold `apps/beauty-os/` com o código-fonte atual (baseline antes da migração)

**Files:**
- Create: `apps/beauty-os/` (todo o conteúdo de `src/`, `public/`, `index.html`, `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`)
- Create: `apps/beauty-os/README.md`

**Interfaces:**
- Produces: projeto Vite rodando localmente, servindo como baseline antes de qualquer mudança de backend

- [ ] **Step 1: Copiar o código-fonte extraído para o repositório**

```bash
mkdir -p apps/beauty-os
cp -r /tmp/claude-0/-home-user-seven-os-platform/f5c05507-009b-5d0d-849a-110e7f7f79bb/scratchpad/leshanot-studio-src/. apps/beauty-os/
# Remove artefatos que não pertencem ao código-fonte do produto:
rm -f apps/beauty-os/LESHANOT_STUDIO_OBSIDIAN.md apps/beauty-os/security_spec.md apps/beauty-os/firebase-blueprint.json apps/beauty-os/firebase-applet-config.json apps/beauty-os/firestore.rules
```

- [ ] **Step 2: Instalar dependências**

Run: `cd apps/beauty-os && npm install`
Expected: instala sem erros (usa `package-lock.json` existente)

- [ ] **Step 3: Verificar que o build funciona no baseline (ainda com Firebase)**

Run: `cd apps/beauty-os && npm run lint`
Expected: `tsc --noEmit` passa sem erros — confirma que o código copiado está íntegro antes de tocar em qualquer linha

- [ ] **Step 4: Commit do baseline**

```bash
git add apps/beauty-os
git commit -m "chore(beauty-os): scaffold Leshanot Studio source as baseline before Supabase migration"
```

---

### Task 2: Schema Supabase multi-tenant com RLS

**Files:**
- Create: `apps/beauty-os/supabase/migrations/0001_initial_schema.sql`

**Interfaces:**
- Produces: tabelas `empresas`, `clients`, `appointments`, `transactions`, `services`, `automation_templates`, `notifications`, `settings`, todas com `empresa_id uuid references empresas(id)` e RLS `using (empresa_id = auth.uid())`

- [ ] **Step 1: Escrever a migration SQL**

```sql
-- apps/beauty-os/supabase/migrations/0001_initial_schema.sql

create table empresas (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default 'Leshanot Studio',
  plano text not null default 'piloto',
  criado_em timestamptz not null default now()
);

alter table empresas enable row level security;
create policy "empresa_self_access" on empresas
  for all using (id = auth.uid()) with check (id = auth.uid());

create table clients (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  name text not null,
  email text default '',
  phone text default '',
  spent numeric not null default 0,
  visits integer not null default 0,
  last_visit date,
  birth_date date,
  tags text[] not null default '{}',
  is_vip boolean not null default false,
  is_favorite boolean not null default false,
  avatar text,
  notes text,
  criado_em timestamptz not null default now()
);
alter table clients enable row level security;
create policy "clients_tenant_isolation" on clients
  for all using (empresa_id = auth.uid()) with check (empresa_id = auth.uid());
create index clients_empresa_idx on clients (empresa_id);

create table services (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  name text not null,
  price numeric not null,
  duration integer not null
);
alter table services enable row level security;
create policy "services_tenant_isolation" on services
  for all using (empresa_id = auth.uid()) with check (empresa_id = auth.uid());
create index services_empresa_idx on services (empresa_id);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  client_name text,
  client_phone text,
  service text not null,
  time text not null,
  date date not null,
  duration integer not null,
  status text not null default 'Pendente'
    check (status in ('Confirmado', 'Pendente', 'Cancelado', 'Concluído')),
  price numeric not null default 0,
  notes text,
  criado_em timestamptz not null default now()
);
alter table appointments enable row level security;
create policy "appointments_tenant_isolation" on appointments
  for all using (empresa_id = auth.uid()) with check (empresa_id = auth.uid());
create index appointments_empresa_idx on appointments (empresa_id);
create index appointments_empresa_date_idx on appointments (empresa_id, date);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  amount numeric not null,
  type text not null check (type in ('revenue', 'expense')),
  category text not null,
  date date not null,
  description text not null
);
alter table transactions enable row level security;
create policy "transactions_tenant_isolation" on transactions
  for all using (empresa_id = auth.uid()) with check (empresa_id = auth.uid());
create index transactions_empresa_idx on transactions (empresa_id);

create table automation_templates (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  title text not null,
  message text not null,
  is_active boolean not null default true,
  type text not null
    check (type in ('welcome', 'confirmation', 'reminder', 'post_attendance', 'birthday', 'custom'))
);
alter table automation_templates enable row level security;
create policy "automation_templates_tenant_isolation" on automation_templates
  for all using (empresa_id = auth.uid()) with check (empresa_id = auth.uid());
create index automation_templates_empresa_idx on automation_templates (empresa_id);

create table automation_logs (
  id text not null,
  empresa_id uuid not null references empresas(id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (empresa_id, id)
);
alter table automation_logs enable row level security;
create policy "automation_logs_tenant_isolation" on automation_logs
  for all using (empresa_id = auth.uid()) with check (empresa_id = auth.uid());

create table notifications (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null check (type in ('booking', 'system', 'financial')),
  read boolean not null default false,
  criado_em timestamptz not null default now()
);
alter table notifications enable row level security;
create policy "notifications_tenant_isolation" on notifications
  for all using (empresa_id = auth.uid()) with check (empresa_id = auth.uid());
create index notifications_empresa_idx on notifications (empresa_id);

create table settings (
  empresa_id uuid primary key references empresas(id) on delete cascade,
  studio_name text not null default 'Leshanot Studio',
  location text not null default 'São Paulo, BR',
  currency text not null default 'BRL'
);
alter table settings enable row level security;
create policy "settings_tenant_isolation" on settings
  for all using (empresa_id = auth.uid()) with check (empresa_id = auth.uid());

-- Realtime: habilita replicação para as tabelas que a UI escuta em tempo real
alter publication supabase_realtime add table clients, appointments, transactions, services, automation_templates, notifications, settings;
```

- [ ] **Step 2: Aplicar a migration no projeto Supabase**

Usar a ferramenta MCP do Supabase (`mcp__Supabase__apply_migration`) com o conteúdo do arquivo acima, ou `supabase db push` se houver Supabase CLI configurada localmente.

- [ ] **Step 3: Verificar que as tabelas e policies foram criadas**

Usar `mcp__Supabase__list_tables` — confirmar que as 8 tabelas existem e cada uma reporta RLS habilitado.

- [ ] **Step 4: Commit**

```bash
git add apps/beauty-os/supabase/migrations/0001_initial_schema.sql
git commit -m "feat(beauty-os): add multi-tenant Supabase schema with RLS"
```

---

### Task 3: Client Supabase (`src/lib/supabase.ts`)

**Files:**
- Create: `apps/beauty-os/src/lib/supabase.ts`
- Delete: `apps/beauty-os/src/lib/firebase.ts`

**Interfaces:**
- Produces: `export const supabase: SupabaseClient` — client único usado por `store.ts` e `Login.tsx`
- Produces: `export enum OperationType { CREATE, UPDATE, DELETE, LIST, GET, WRITE }` (mantido para compatibilidade com o padrão de log de erro já usado em `store.ts`)
- Produces: `export function handleSupabaseError(error: unknown, operationType: OperationType, path: string | null): never`

- [ ] **Step 1: Adicionar dependência**

Run: `cd apps/beauty-os && npm install @supabase/supabase-js && npm uninstall firebase`

- [ ] **Step 2: Criar o client**

```typescript
// apps/beauty-os/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface SupabaseErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleSupabaseError(error: unknown, operationType: OperationType, path: string | null): never {
  const { data } = { data: null } as { data: { user: { id: string; email?: string } } | null };
  const errInfo: SupabaseErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: data?.user?.id ?? null,
      email: data?.user?.email ?? null,
    },
    operationType,
    path,
  };
  console.error('Supabase Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
```

- [ ] **Step 3: Remover `src/lib/firebase.ts`**

```bash
rm apps/beauty-os/src/lib/firebase.ts apps/beauty-os/firebase-applet-config.json
```

- [ ] **Step 4: Atualizar `.env.example`**

```env
# apps/beauty-os/.env.example

# Supabase (client-side, prefixo VITE_ obrigatório para o Vite expor no bundle)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui

# Gemini (server-side apenas — função serverless, SEM prefixo VITE_)
GEMINI_API_KEY=sua_chave_gemini_aqui
```

- [ ] **Step 5: Verificar typecheck**

Run: `cd apps/beauty-os && npm run lint`
Expected: falha nesta etapa é esperada — `store.ts` e `Login.tsx` ainda importam `./firebase`. Confirmar que o único erro reportado é "Cannot find module './firebase'" (senão, algo além do esperado quebrou).

- [ ] **Step 6: Commit**

```bash
git add -A apps/beauty-os
git commit -m "feat(beauty-os): add Supabase client, remove Firebase dependency"
```

---

### Task 4: Migrar autenticação (`src/screens/Login.tsx`)

**Files:**
- Modify: `apps/beauty-os/src/screens/Login.tsx`

**Interfaces:**
- Consumes: `supabase` de `../lib/supabase`
- Produces: mesmo fluxo de UI (seleção → e-mail/senha → registro → esqueci senha), agora via `supabase.auth.signInWithPassword`, `supabase.auth.signUp`, `supabase.auth.resetPasswordForEmail`. Login com Google fica fora desta fase (Supabase exige configurar provider OAuth separadamente) — trocado por um aviso "em breve", sem quebrar a tela.

- [ ] **Step 1: Reescrever os handlers de autenticação**

```typescript
// apps/beauty-os/src/screens/Login.tsx
// Substituir os imports do Firebase:
// import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
// import { auth } from '../lib/firebase';
// Por:
import { supabase } from '../lib/supabase';

// handleGoogleLogin: remover o botão de Google nesta fase (comentar/ocultar),
// já que exige configuração de provider OAuth fora do escopo desta migração.

const handleEmailLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError('');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setError('E-mail ou senha incorretos.');
  }
  setLoading(false);
};

const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError('');
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    setError(error.message.includes('already registered') ? 'Este e-mail já está em uso.' : 'Erro ao criar conta. Tente novamente.');
  }
  setLoading(false);
};

const handleForgotPassword = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError('');
  setSuccess('');
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) {
    setError('Erro ao enviar e-mail. Verifique o endereço.');
  } else {
    setSuccess('E-mail de recuperação enviado!');
  }
  setLoading(false);
};
```

- [ ] **Step 2: Remover o botão "Entrar com Google" do JSX** (ou desabilitar com `disabled` + texto "Em breve") para não deixar uma ação morta na tela.

- [ ] **Step 3: Verificar typecheck**

Run: `cd apps/beauty-os && npm run lint`
Expected: sem erros relacionados a `Login.tsx`

- [ ] **Step 4: Commit**

```bash
git add apps/beauty-os/src/screens/Login.tsx
git commit -m "feat(beauty-os): migrate auth screen from Firebase Auth to Supabase Auth"
```

---

### Task 5: Migrar `store.ts` — Clientes e Serviços

**Files:**
- Modify: `apps/beauty-os/src/lib/store.ts`

**Interfaces:**
- Consumes: `supabase` de `./supabase`, `handleSupabaseError`, `OperationType`
- Produces: `addClient`, `updateClient`, `toggleFavorite`, `deleteClient`, `addService`, `updateService`, `deleteService` com a mesma assinatura já declarada na interface `AppStore` (linhas 116-119 e 137-139 do arquivo original) — só troca a implementação interna

- [ ] **Step 1: Trocar os imports do topo do arquivo**

```typescript
// Substituir:
// import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, query, orderBy, setDoc } from 'firebase/firestore';
// import { onAuthStateChanged, User, updateProfile } from 'firebase/auth';
// import { db, auth, OperationType, handleFirestoreError } from './firebase';
// Por:
import { supabase, OperationType, handleSupabaseError } from './supabase';
import type { User } from '@supabase/supabase-js';
```

- [ ] **Step 2: Reescrever `addClient`, `updateClient`, `toggleFavorite`, `deleteClient`**

```typescript
addClient: async (client) => {
  const user = get().user;
  if (!user) return;
  try {
    const { error } = await supabase.from('clients').insert({
      empresa_id: user.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      tags: client.tags,
      notes: client.notes ?? null,
      spent: 0,
      visits: 0,
      last_visit: new Date().toISOString().split('T')[0],
      is_vip: false,
      is_favorite: false,
    });
    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, OperationType.CREATE, 'clients');
  }
},

updateClient: async (id, updates) => {
  const user = get().user;
  if (!user) return;
  try {
    const { error } = await supabase.from('clients').update(toSnakeCaseClient(updates)).eq('id', id).eq('empresa_id', user.id);
    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, OperationType.UPDATE, `clients/${id}`);
  }
},

toggleFavorite: async (id) => {
  const client = get().clients.find(c => c.id === id);
  if (client) {
    await get().updateClient(id, { isFavorite: !client.isFavorite });
  }
},

deleteClient: async (id) => {
  const user = get().user;
  if (!user) return;
  try {
    const { error } = await supabase.from('clients').delete().eq('id', id).eq('empresa_id', user.id);
    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, OperationType.DELETE, `clients/${id}`);
  }
},
```

- [ ] **Step 3: Adicionar o helper de conversão camelCase→snake_case no topo do arquivo**

```typescript
function toSnakeCaseClient(updates: Partial<Client>) {
  const mapped: Record<string, unknown> = {};
  if (updates.name !== undefined) mapped.name = updates.name;
  if (updates.email !== undefined) mapped.email = updates.email;
  if (updates.phone !== undefined) mapped.phone = updates.phone;
  if (updates.spent !== undefined) mapped.spent = updates.spent;
  if (updates.visits !== undefined) mapped.visits = updates.visits;
  if (updates.lastVisit !== undefined) mapped.last_visit = updates.lastVisit;
  if (updates.birthDate !== undefined) mapped.birth_date = updates.birthDate;
  if (updates.tags !== undefined) mapped.tags = updates.tags;
  if (updates.isVIP !== undefined) mapped.is_vip = updates.isVIP;
  if (updates.isFavorite !== undefined) mapped.is_favorite = updates.isFavorite;
  if (updates.notes !== undefined) mapped.notes = updates.notes;
  return mapped;
}

function fromSnakeCaseClient(row: any): Client {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? '',
    phone: row.phone ?? '',
    spent: Number(row.spent) || 0,
    visits: row.visits || 0,
    lastVisit: row.last_visit ?? '',
    birthDate: row.birth_date ?? undefined,
    tags: row.tags ?? [],
    isVIP: row.is_vip,
    isFavorite: row.is_favorite,
    notes: row.notes ?? undefined,
  };
}
```

- [ ] **Step 4: Reescrever `addService`, `updateService`, `deleteService`**

```typescript
addService: async (service) => {
  const user = get().user;
  if (!user) return;
  try {
    const { error } = await supabase.from('services').insert({ empresa_id: user.id, ...service });
    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, OperationType.CREATE, 'services');
  }
},

updateService: async (id, updates) => {
  const user = get().user;
  if (!user) return;
  try {
    const { error } = await supabase.from('services').update(updates).eq('id', id).eq('empresa_id', user.id);
    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, OperationType.UPDATE, `services/${id}`);
  }
},

deleteService: async (id) => {
  const user = get().user;
  if (!user) return;
  try {
    const { error } = await supabase.from('services').delete().eq('id', id).eq('empresa_id', user.id);
    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, OperationType.DELETE, `services/${id}`);
  }
},
```

- [ ] **Step 5: Verificar typecheck do trecho migrado**

Run: `cd apps/beauty-os && npx tsc --noEmit`
Expected: sem novos erros relacionados a `clients`/`services` (erros em outras seções ainda não migradas são esperados até a Task 7)

- [ ] **Step 6: Commit**

```bash
git add apps/beauty-os/src/lib/store.ts
git commit -m "feat(beauty-os): migrate clients and services store actions to Supabase"
```

---

### Task 6: Migrar `store.ts` — Agendamentos, Transações, Notificações, Automação, Settings

**Files:**
- Modify: `apps/beauty-os/src/lib/store.ts`

**Interfaces:**
- Consumes: `toSnakeCaseClient`/`fromSnakeCaseClient` (Task 5), `supabase`, `handleSupabaseError`, `OperationType`
- Produces: `addAppointment`, `updateAppointment`, `updateAppointmentStatus`, `deleteAppointment`, `completeAppointment`, `isSlotAvailable` (lógica local, sem mudança), `addTransaction`, `deleteTransaction`, `addNotification`, `markNotificationAsRead`, `deleteNotification`, `updateAutomationTemplate`, `addAutomationLog`, `updateSettings` — mesmas assinaturas da interface `AppStore` original

- [ ] **Step 1: Reescrever `addAppointment` preservando a lógica de negócio (detecção de conflito + auto-criação de cliente em booking público)**

```typescript
addAppointment: async (appointment) => {
  const { user, clients, addNotification } = get();
  if (!user) return;

  try {
    if (!get().isSlotAvailable(appointment.date, appointment.time, appointment.duration)) {
      get().setToast({ message: "Conflito de horário! Este slot já está ocupado ou sobrepõe outro agendamento.", type: 'error' });
      logger.warn('Booking', 'Tentativa de agendamento em horário ocupado ou sobreposto', { date: appointment.date, time: appointment.time });
      return;
    }

    let finalClientId = appointment.clientId;

    if (appointment.clientId === 'public-booking' || !appointment.clientId) {
      const existingClient = clients.find(c => c.phone === appointment.clientPhone);
      if (existingClient) {
        finalClientId = existingClient.id;
      } else if (appointment.clientName && appointment.clientPhone) {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            empresa_id: user.id,
            name: appointment.clientName,
            phone: appointment.clientPhone,
            email: '',
            spent: 0,
            visits: 0,
            last_visit: appointment.date,
            is_vip: false,
            is_favorite: false,
            tags: ['Novo'],
          })
          .select()
          .single();
        if (clientError) throw clientError;
        finalClientId = newClient.id;
      }
    }

    const startTime = performance.now();
    const { error } = await supabase.from('appointments').insert({
      empresa_id: user.id,
      client_id: finalClientId === 'public-booking' ? null : finalClientId,
      client_name: appointment.clientName,
      client_phone: appointment.clientPhone,
      service: appointment.service,
      time: appointment.time,
      date: appointment.date,
      duration: appointment.duration,
      status: appointment.status,
      price: appointment.price,
      notes: appointment.notes ?? null,
    });
    if (error) throw error;
    perfMonitor.recordFirebaseLatency(performance.now() - startTime);
    logger.info('Booking', 'Agendamento criado com sucesso', { client: appointment.clientName, service: appointment.service });

    await addNotification({
      title: 'Novo agendamento',
      message: `${appointment.service} em ${new Date(appointment.date + 'T12:00:00').toLocaleDateString()} às ${appointment.time}`,
      type: 'booking',
      read: false,
      createdAt: new Date().toISOString(),
    });

    get().setToast({ message: "Agendamento realizado com sucesso!", type: 'success' });
  } catch (error) {
    handleSupabaseError(error, OperationType.CREATE, 'appointments');
  }
},
```

- [ ] **Step 2: Reescrever `updateAppointment`, `updateAppointmentStatus`, `deleteAppointment`**

```typescript
updateAppointment: async (id, updates) => {
  const { user, appointments } = get();
  if (!user) return;

  if (updates.date || updates.time || updates.duration) {
    const current = appointments.find(a => a.id === id);
    if (current) {
      const date = updates.date || current.date;
      const time = updates.time || current.time;
      const duration = updates.duration || current.duration;

      if (!get().isSlotAvailable(date, time, duration, id)) {
        get().setToast({ message: "Conflito de horário! O novo horário já está ocupado.", type: 'error' });
        return;
      }
    }
  }

  try {
    const { error } = await supabase
      .from('appointments')
      .update({
        client_id: updates.clientId,
        client_name: updates.clientName,
        client_phone: updates.clientPhone,
        service: updates.service,
        time: updates.time,
        date: updates.date,
        duration: updates.duration,
        status: updates.status,
        price: updates.price,
        notes: updates.notes,
      })
      .eq('id', id)
      .eq('empresa_id', user.id);
    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, OperationType.UPDATE, `appointments/${id}`);
  }
},

updateAppointmentStatus: async (id, status) => {
  const user = get().user;
  if (!user) return;
  try {
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id).eq('empresa_id', user.id);
    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, OperationType.UPDATE, `appointments/${id}`);
  }
},

deleteAppointment: async (id) => {
  const user = get().user;
  if (!user) return;
  try {
    const { error } = await supabase.from('appointments').delete().eq('id', id).eq('empresa_id', user.id);
    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, OperationType.DELETE, `appointments/${id}`);
  }
},
```

- [ ] **Step 3: Reescrever `completeAppointment`** (marca status Concluído, cria transação de receita, atualiza `spent`/`visits`/`isVIP` do cliente, dispara notificação — mesma sequência de 4 passos do arquivo original)

```typescript
completeAppointment: async (id) => {
  const { user, appointments, updateAppointmentStatus, addTransaction, updateClient, addNotification } = get();
  if (!user) return;

  const appointment = appointments.find(a => a.id === id);
  if (!appointment || appointment.status === 'Concluído') return;

  try {
    await updateAppointmentStatus(id, 'Concluído');

    await addTransaction({
      amount: appointment.price,
      type: 'revenue',
      category: 'Serviço',
      date: appointment.date,
      description: `Conclusão: ${appointment.service} - ${appointment.clientName || 'Cliente'}`,
    });

    if (appointment.clientId && appointment.clientId !== 'public-booking') {
      const client = get().clients.find(c => c.id === appointment.clientId);
      if (client) {
        await updateClient(appointment.clientId, {
          spent: (client.spent || 0) + appointment.price,
          visits: (client.visits || 0) + 1,
          lastVisit: appointment.date,
          isVIP: (client.visits || 0) + 1 >= 5,
        });
      }
    }

    await addNotification({
      title: 'Atendimento concluído',
      message: `Financeiro atualizado: +R$ ${appointment.price}`,
      type: 'financial',
      read: false,
      createdAt: new Date().toISOString(),
    });

    get().setToast({ message: "Atendimento concluído e registrado!", type: 'success' });
  } catch (error) {
    console.error('Error completing appointment:', error);
  }
},
```

- [ ] **Step 4: Reescrever as operações restantes de CRUD simples** — mesmo padrão de `insert`/`update`/`delete` filtrando por `empresa_id`/`user.id`, envolvido em `try/catch` chamando `handleSupabaseError`:

```typescript
addTransaction: async (transaction) => {
  const user = get().user;
  if (!user) return;
  try {
    const { error } = await supabase.from('transactions').insert({ empresa_id: user.id, ...transaction });
    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, OperationType.CREATE, 'transactions');
  }
},

deleteTransaction: async (id) => {
  const user = get().user;
  if (!user) return;
  try {
    const { error } = await supabase.from('transactions').delete().eq('id', id).eq('empresa_id', user.id);
    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, OperationType.DELETE, `transactions/${id}`);
  }
},

addNotification: async (notification) => {
  const user = get().user;
  if (!user) return;
  try {
    const { error } = await supabase.from('notifications').insert({
      empresa_id: user.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      read: notification.read,
    });
    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, OperationType.CREATE, 'notifications');
  }
},

markNotificationAsRead: async (id) => {
  const user = get().user;
  if (!user) return;
  try {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id).eq('empresa_id', user.id);
    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, OperationType.UPDATE, `notifications/${id}`);
  }
},

deleteNotification: async (id) => {
  const user = get().user;
  if (!user) return;
  try {
    const { error } = await supabase.from('notifications').delete().eq('id', id).eq('empresa_id', user.id);
    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, OperationType.DELETE, `notifications/${id}`);
  }
},

updateAutomationTemplate: async (id, updates) => {
  const user = get().user;
  if (!user) return;
  try {
    const { error } = await supabase
      .from('automation_templates')
      .update({ title: updates.title, message: updates.message, is_active: updates.isActive, type: updates.type })
      .eq('id', id)
      .eq('empresa_id', user.id);
    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, OperationType.UPDATE, `automation_templates/${id}`);
  }
},

addAutomationLog: async (logKey) => {
  const user = get().user;
  if (!user) return;
  try {
    const { error } = await supabase.from('automation_logs').upsert({ id: logKey, empresa_id: user.id, sent_at: new Date().toISOString() });
    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, OperationType.WRITE, `automation_logs/${logKey}`);
  }
},

updateSettings: async (updates) => {
  const { user, settings } = get();
  if (!user) return;
  try {
    const newSettings = { ...settings, ...updates };
    const { error } = await supabase.from('settings').upsert({
      empresa_id: user.id,
      studio_name: newSettings.studioName,
      location: newSettings.location,
      currency: newSettings.currency,
    });
    if (error) throw error;
    set({ settings: newSettings });
  } catch (error) {
    handleSupabaseError(error, OperationType.UPDATE, 'settings');
  }
},
```

- [ ] **Step 4: Remover `updateUserAvatar`** (dependia de `updateProfile` do Firebase Auth; Supabase Auth usa `supabase.auth.updateUser({ data: { avatar_url } })` — reimplementar com essa chamada, mantendo a assinatura `(photoURL: string) => Promise<void>`)

- [ ] **Step 5: Verificar typecheck completo**

Run: `cd apps/beauty-os && npx tsc --noEmit`
Expected: 0 erros

- [ ] **Step 6: Commit**

```bash
git add apps/beauty-os/src/lib/store.ts
git commit -m "feat(beauty-os): migrate appointments, transactions, notifications, automation and settings to Supabase"
```

---

### Task 7: Realtime + inicialização de sessão (substitui os listeners `onSnapshot`/`onAuthStateChanged`)

**Files:**
- Modify: `apps/beauty-os/src/lib/store.ts`

**Interfaces:**
- Produces: `startListeners(empresaId: string)` e `stopListeners()` (mesmos nomes internos do original), agora usando `supabase.channel(...).on('postgres_changes', ...)` em vez de `onSnapshot`; `supabase.auth.onAuthStateChange` em vez de `onAuthStateChanged`

- [ ] **Step 1: Reescrever `startListeners`/`stopListeners` usando Supabase Realtime**

```typescript
const startListeners = (empresaId: string) => {
  stopListeners();

  const fetchAndSet = async <T,>(
    table: string,
    setter: (rows: T[]) => void,
    mapRow: (row: any) => T,
    orderColumn?: string,
  ) => {
    let q = supabase.from(table).select('*').eq('empresa_id', empresaId);
    if (orderColumn) q = q.order(orderColumn, { ascending: true });
    const { data, error } = await q;
    if (error) { handleSupabaseError(error, OperationType.LIST, table); return; }
    setter((data ?? []).map(mapRow));
  };

  fetchAndSet('clients', (rows) => set({ clients: rows }), fromSnakeCaseClient);
  fetchAndSet('appointments', (rows) => set({ appointments: rows }), fromSnakeCaseAppointment, 'time');
  fetchAndSet('transactions', (rows) => set({ transactions: rows }), fromSnakeCaseTransaction, 'date');
  fetchAndSet('services', (rows) => set({ services: rows }), (r) => r as Service);
  fetchAndSet('automation_templates', (rows) => set({ automationTemplates: rows }), fromSnakeCaseAutomation);
  fetchAndSet('notifications', (rows) => set({ notifications: rows }), fromSnakeCaseNotification, 'criado_em');

  const channel = supabase
    .channel(`empresa-${empresaId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'clients', filter: `empresa_id=eq.${empresaId}` },
      () => fetchAndSet('clients', (rows) => set({ clients: rows }), fromSnakeCaseClient))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `empresa_id=eq.${empresaId}` },
      () => fetchAndSet('appointments', (rows) => set({ appointments: rows }), fromSnakeCaseAppointment, 'time'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `empresa_id=eq.${empresaId}` },
      () => fetchAndSet('transactions', (rows) => set({ transactions: rows }), fromSnakeCaseTransaction, 'date'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `empresa_id=eq.${empresaId}` },
      () => fetchAndSet('notifications', (rows) => set({ notifications: rows }), fromSnakeCaseNotification, 'criado_em'))
    .subscribe();

  realtimeChannel = channel;

  // Settings tem uma linha por empresa (chave primária = empresa_id)
  supabase.from('settings').select('*').eq('empresa_id', empresaId).maybeSingle().then(({ data }) => {
    if (data) {
      set({ settings: { studioName: data.studio_name, location: data.location, currency: data.currency } });
    } else {
      const defaults = { studioName: 'Leshanot Studio', location: 'São Paulo, BR', currency: 'BRL' };
      supabase.from('settings').insert({ empresa_id: empresaId, studio_name: defaults.studioName, location: defaults.location, currency: defaults.currency });
      set({ settings: defaults });
    }
  });
};

const stopListeners = () => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
};
```

Declarar `let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;` junto às demais variáveis de listener no topo do `create<AppStore>()(...)`, e os helpers `fromSnakeCaseAppointment`, `fromSnakeCaseTransaction`, `fromSnakeCaseAutomation`, `fromSnakeCaseNotification` seguindo o mesmo padrão de `fromSnakeCaseClient` (Task 5).

- [ ] **Step 2: Substituir o listener de auth**

```typescript
supabase.auth.onAuthStateChange((_event, session) => {
  const user = session?.user ?? null;
  set({ user, loading: false });
  if (user) {
    startListeners(user.id);
  } else {
    stopListeners();
    set({ clients: [], appointments: [], transactions: [] });
  }
});
```

- [ ] **Step 3: Verificar typecheck**

Run: `cd apps/beauty-os && npx tsc --noEmit`
Expected: 0 erros

- [ ] **Step 4: Smoke test manual local**

Run: `cd apps/beauty-os && npm run dev` (ajustar `package.json` — ver Task 8 — antes deste passo, ou rodar `npx vite` diretamente já que `server.ts`/Express ainda não foi removido nesta task)
Expected: app sobe, tela de Login aparece sem erros no console relacionados a `firebase`

- [ ] **Step 5: Commit**

```bash
git add apps/beauty-os/src/lib/store.ts
git commit -m "feat(beauty-os): replace Firestore onSnapshot listeners with Supabase Realtime channels"
```

---

### Task 8: Remover Express, criar função serverless da Vercel para o assistente de voz

**Files:**
- Create: `apps/beauty-os/api/voice/parse.ts`
- Delete: `apps/beauty-os/server.ts`
- Modify: `apps/beauty-os/package.json`
- Create: `apps/beauty-os/vercel.json`

**Interfaces:**
- Consumes: `GoogleGenAI` de `@google/genai` (mesma lib já usada em `server.ts`)
- Produces: rota HTTP `POST /api/voice/parse` com o mesmo contrato de request/response que `src/services/voiceService.ts` já consome (`{ text, context } → { action, data, message, status }`) — nenhuma mudança necessária em `voiceService.ts`

- [ ] **Step 1: Criar a função serverless**

```typescript
// apps/beauty-os/api/voice/parse.ts
import { GoogleGenAI, Type } from "@google/genai";

export const config = { runtime: 'nodejs20.x' };

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const { text, context } = await req.json();
  if (!text) {
    return new Response(JSON.stringify({ error: 'Text is required' }), { status: 400 });
  }

  try {
    const todayString = new Date().toISOString().split('T')[0];
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Você é o assistente operacional (AI) do Leshanot Studio. O sistema é voltado para gestão de estética.
Comando: "${text}"
Contexto: ${JSON.stringify(context || {})}
Hoje: ${todayString}

Ações Suportadas:
- create_appointment: {clientName, service, date, time}
- cancel_appointment: {clientName, date, time}
- create_client: {name, phone?}
- create_revenue: {amount, description?}
- create_expense: {amount, description, category?}
- update_client_notes: {clientName, notes}
- update_client_vip: {clientName, isVIP}
- create_service: {name, price, duration?}
- get_daily_summary: {}
- show_dashboard_summary: {}
- unknown: {}

Regras:
1. Retorne JSON estruturado.
2. Identifique nomes de clientes e serviços no contexto se possível.
3. Se faltar dado vital (ex: valor da despesa ou hora do agendamento), use status 'incomplete'.
4. 'message' deve ser uma resposta curta e profissional confirmando a ação ou pedindo o que falta.

JSON:
{
  "action": "...",
  "data": { ... },
  "message": "...",
  "status": "complete" | "incomplete"
}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING },
            data: { type: Type.OBJECT },
            message: { type: Type.STRING },
            status: { type: Type.STRING },
          },
          required: ["action", "message", "status"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error("Gemini Error:", error);
    return new Response(JSON.stringify({ error: "Failed to process voice command" }), { status: 500 });
  }
}
```

- [ ] **Step 2: Remover `server.ts` e as dependências de Express**

```bash
rm apps/beauty-os/server.ts
cd apps/beauty-os && npm uninstall express @types/express dotenv
```

- [ ] **Step 3: Atualizar scripts do `package.json`**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "lint": "tsc --noEmit"
  }
}
```

(remove os scripts `start` e `clean` que dependiam do bundle do Express)

- [ ] **Step 4: Criar `vercel.json`**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

- [ ] **Step 5: Verificar build de produção**

Run: `cd apps/beauty-os && npm run build`
Expected: gera `apps/beauty-os/dist/` sem erros

- [ ] **Step 6: Commit**

```bash
git add -A apps/beauty-os
git commit -m "feat(beauty-os): replace Express server with Vercel serverless function, configure Vercel build"
```

---

### Task 9: Revisão de segurança e qualidade antes do piloto

**Files:**
- Nenhum arquivo novo — este task roda as skills de revisão sobre o diff acumulado das Tasks 1-8

- [ ] **Step 1: Rodar a skill `security-review`** sobre o diff completo de `apps/beauty-os`, com foco em: policies RLS da migration (Task 2) cobrem todas as tabelas sem furo; `GEMINI_API_KEY` não vaza para o client (só usado em `api/voice/parse.ts`, nunca em código sob `src/`); `VITE_SUPABASE_ANON_KEY` é seguro de expor (é a chave pública por design do Supabase, mas confirmar que nenhuma chave `service_role` foi commitada em qualquer arquivo)

- [ ] **Step 2: Rodar a skill `code-review`** sobre o mesmo diff, nível `medium`, focando em bugs de correção (ex: filtros `empresa_id` faltando em alguma query, mapeamento camelCase/snake_case inconsistente entre `toSnakeCaseClient`/`fromSnakeCaseClient` e as demais entidades)

- [ ] **Step 3: Corrigir achados críticos ou de alta confiança** encontrados nos passos 1-2 diretamente nos arquivos de `apps/beauty-os`, cada correção em um commit próprio

- [ ] **Step 4: Rodar o build final**

Run: `cd apps/beauty-os && npm run build`
Expected: sucesso, sem warnings de tipo

---

## Fora de escopo deste plano (Fase 2 — plano separado)

Profissionais/Equipe, Comissões, CRM de Retorno e Relatórios avançados (definidos no spec) formam um subsistema independente que depende desta migração estar completa e validada primeiro. Serão cobertos por `docs/superpowers/plans/<data>-leshanot-beauty-os-fase2-modulos.md`, escrito depois que a Fase 1 estiver rodando em produção.

Deploy efetivo na Vercel (conectar o repositório ao projeto Vercel, configurar variáveis de ambiente no painel, apontar domínio) depende de acesso à conta Vercel do usuário e fica como passo manual documentado no `README.md` de `apps/beauty-os/`, não uma task automatizável nesta sessão.

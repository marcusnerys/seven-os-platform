-- Leshanot Beauty OS (piloto) — schema inicial multi-tenant
-- empresa_id = auth.uid() do dono da empresa (1:1 nesta fase do piloto)
--
-- NOTA IMPORTANTE: este projeto Supabase ("SEVEN OS") já contém um schema
-- pré-existente e mais sofisticado (units, profiles, clients, staff,
-- services, appointments, service_sessions, payments, commissions,
-- crm_actions, notifications, etc.) que parece ser o CORE real do Seven OS
-- Platform, com suporte multi-unidade e papéis (admin/manager/receptionist/
-- professional/cashier/concierge) — cobrindo inclusive Profissionais e
-- Comissões (a Fase 2 do piloto Beauty OS).
--
-- Para não colidir nem sobrescrever esse schema existente, as tabelas do
-- piloto Leshanot Beauty OS usam o prefixo `beautyos_`. Ver
-- docs/superpowers/plans/2026-08-20-leshanot-beauty-os-fase1-migracao.md
-- para a decisão registrada e a recomendação de consolidação futura.

create table beautyos_empresas (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default 'Leshanot Studio',
  plano text not null default 'piloto',
  criado_em timestamptz not null default now()
);

alter table beautyos_empresas enable row level security;
create policy "empresa_self_access" on beautyos_empresas
  for all using (id = auth.uid()) with check (id = auth.uid());

create table beautyos_clients (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references beautyos_empresas(id) on delete cascade,
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
alter table beautyos_clients enable row level security;
create policy "clients_tenant_isolation" on beautyos_clients
  for all using (empresa_id = auth.uid()) with check (empresa_id = auth.uid());
create index beautyos_clients_empresa_idx on beautyos_clients (empresa_id);

create table beautyos_services (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references beautyos_empresas(id) on delete cascade,
  name text not null,
  price numeric not null,
  duration integer not null
);
alter table beautyos_services enable row level security;
create policy "services_tenant_isolation" on beautyos_services
  for all using (empresa_id = auth.uid()) with check (empresa_id = auth.uid());
create index beautyos_services_empresa_idx on beautyos_services (empresa_id);

create table beautyos_appointments (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references beautyos_empresas(id) on delete cascade,
  client_id uuid references beautyos_clients(id) on delete set null,
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
alter table beautyos_appointments enable row level security;
create policy "appointments_tenant_isolation" on beautyos_appointments
  for all using (empresa_id = auth.uid()) with check (empresa_id = auth.uid());
create index beautyos_appointments_empresa_idx on beautyos_appointments (empresa_id);
create index beautyos_appointments_empresa_date_idx on beautyos_appointments (empresa_id, date);

create table beautyos_transactions (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references beautyos_empresas(id) on delete cascade,
  amount numeric not null,
  type text not null check (type in ('revenue', 'expense')),
  category text not null,
  date date not null,
  description text not null
);
alter table beautyos_transactions enable row level security;
create policy "transactions_tenant_isolation" on beautyos_transactions
  for all using (empresa_id = auth.uid()) with check (empresa_id = auth.uid());
create index beautyos_transactions_empresa_idx on beautyos_transactions (empresa_id);

create table beautyos_automation_templates (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references beautyos_empresas(id) on delete cascade,
  title text not null,
  message text not null,
  is_active boolean not null default true,
  type text not null
    check (type in ('welcome', 'confirmation', 'reminder', 'post_attendance', 'birthday', 'custom'))
);
alter table beautyos_automation_templates enable row level security;
create policy "automation_templates_tenant_isolation" on beautyos_automation_templates
  for all using (empresa_id = auth.uid()) with check (empresa_id = auth.uid());
create index beautyos_automation_templates_empresa_idx on beautyos_automation_templates (empresa_id);

create table beautyos_automation_logs (
  id text not null,
  empresa_id uuid not null references beautyos_empresas(id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (empresa_id, id)
);
alter table beautyos_automation_logs enable row level security;
create policy "automation_logs_tenant_isolation" on beautyos_automation_logs
  for all using (empresa_id = auth.uid()) with check (empresa_id = auth.uid());

create table beautyos_notifications (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references beautyos_empresas(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null check (type in ('booking', 'system', 'financial')),
  read boolean not null default false,
  criado_em timestamptz not null default now()
);
alter table beautyos_notifications enable row level security;
create policy "notifications_tenant_isolation" on beautyos_notifications
  for all using (empresa_id = auth.uid()) with check (empresa_id = auth.uid());
create index beautyos_notifications_empresa_idx on beautyos_notifications (empresa_id);

create table beautyos_settings (
  empresa_id uuid primary key references beautyos_empresas(id) on delete cascade,
  studio_name text not null default 'Leshanot Studio',
  location text not null default 'São Paulo, BR',
  currency text not null default 'BRL'
);
alter table beautyos_settings enable row level security;
create policy "settings_tenant_isolation" on beautyos_settings
  for all using (empresa_id = auth.uid()) with check (empresa_id = auth.uid());

-- Realtime: habilita replicação para as tabelas que a UI escuta em tempo real
alter publication supabase_realtime add table
  beautyos_clients, beautyos_appointments, beautyos_transactions,
  beautyos_services, beautyos_automation_templates, beautyos_notifications,
  beautyos_settings;

-- Cria automaticamente a linha em `beautyos_empresas` (e `beautyos_settings`
-- padrão) quando um usuário se cadastra. Sem isso, o primeiro insert em
-- beautyos_clients/beautyos_appointments/etc. falharia por violação de FK.
create function public.handle_new_beautyos_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.beautyos_empresas (id) values (new.id);
  insert into public.beautyos_settings (empresa_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created_beautyos
  after insert on auth.users
  for each row execute function public.handle_new_beautyos_user();

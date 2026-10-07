-- Gastos fixos mensais, compras parceladas e dízimo.
--
-- Fixo (aluguel, internet, escola): o app lança a despesa uma vez por mês,
-- no dia combinado. Parcelado (geladeira em 10x): as parcelas são lançadas
-- todas de uma vez, uma por mês, "Geladeira (3/10)". Cada lançamento gerado
-- leva o id do recorrente e o mês (competencia): o índice único impede o
-- mesmo mês de entrar duas vezes, mesmo com dois aparelhos abertos.

create table if not exists public.beautyos_recorrentes (
  id             uuid        primary key default gen_random_uuid(),
  empresa_id     uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  tipo           text        not null check (tipo in ('fixo', 'parcelado')),
  descricao      text        not null,
  valor          numeric     not null check (valor > 0),
  categoria      text        not null default 'Contas',
  dia            integer     not null check (dia between 1 and 31),
  parcelas       integer     check (parcelas is null or parcelas between 2 and 120),
  inicio         text        not null check (inicio ~ '^\d{4}-\d{2}$'),
  -- Último mês já lançado (AAAA-MM). Apagar um lançamento gerado não faz
  -- ele voltar: a geração segue daqui para frente.
  ultimo_gerado  text        check (ultimo_gerado is null or ultimo_gerado ~ '^\d{4}-\d{2}$'),
  criado_em      timestamptz not null default now()
);

create index if not exists beautyos_recorrentes_empresa_idx on public.beautyos_recorrentes (empresa_id);

alter table public.beautyos_recorrentes enable row level security;
drop policy if exists recorrentes_dono on public.beautyos_recorrentes;
create policy recorrentes_dono on public.beautyos_recorrentes
  for all using (empresa_id = auth.uid()) with check (empresa_id = auth.uid());

alter table public.beautyos_recorrentes replica identity full;
alter publication supabase_realtime add table public.beautyos_recorrentes;

alter table public.beautyos_transactions
  add column if not exists recorrente_id uuid references public.beautyos_recorrentes(id) on delete set null,
  add column if not exists competencia   text;

-- Nulos não colidem: lançamentos comuns (sem recorrente) não são afetados.
create unique index if not exists beautyos_transactions_recorrente_mes_key
  on public.beautyos_transactions (recorrente_id, competencia);

-- Dízimo: ligado por padrão (o público do app devolve o dízimo), 10%.
alter table public.beautyos_settings
  add column if not exists dizimo_ativo      boolean not null default true,
  add column if not exists dizimo_percentual numeric not null default 10
    check (dizimo_percentual > 0 and dizimo_percentual <= 100);

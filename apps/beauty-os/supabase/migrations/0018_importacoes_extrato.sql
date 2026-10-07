-- Leitura de extrato em segundo plano.
--
-- A leitura com IA de um PDF leva de 20 s a mais de um minuto. Antes, a tela
-- ficava travada em "Lendo extrato com IA..." esperando a resposta, e trocar
-- de app no meio perdia tudo. Agora a função parse-statement cria uma linha
-- aqui, responde na hora e continua lendo em segundo plano, gravando o
-- progresso e o resultado. O app acompanha pelo realtime e, se a pessoa
-- fechar e voltar, encontra o extrato pronto para revisar.

create table if not exists public.beautyos_importacoes (
  id            uuid        primary key default gen_random_uuid(),
  empresa_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  status        text        not null default 'lendo' check (status in ('lendo', 'pronto', 'erro')),
  arquivo       text,
  encontradas   integer     not null default 0,
  transacoes    jsonb,
  erro          text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists beautyos_importacoes_empresa_idx
  on public.beautyos_importacoes (empresa_id, criado_em desc);

alter table public.beautyos_importacoes enable row level security;

-- A função grava com o token de quem enviou o arquivo, então a mesma regra
-- do resto do app basta: cada negócio só vê e mexe nas próprias leituras.
drop policy if exists importacoes_dono on public.beautyos_importacoes;
create policy importacoes_dono on public.beautyos_importacoes
  for all using (empresa_id = auth.uid()) with check (empresa_id = auth.uid());

alter table public.beautyos_importacoes replica identity full;
alter publication supabase_realtime add table public.beautyos_importacoes;

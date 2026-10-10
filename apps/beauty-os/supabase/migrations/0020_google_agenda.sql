-- Integração direta com o Google Agenda (v3).
--
-- A assinatura por link (migration 0017) continua, mas o Google só relê o
-- link algumas vezes por dia. Aqui a pessoa entra com a conta Google uma vez
-- (OAuth, permissão calendar.app.created), o app cria uma agenda própria
-- "Leshanot" na conta dela e cada agendamento criado, remarcado ou cancelado
-- vai para lá na hora — inclusive os da página pública de agendamento,
-- porque quem avisa é o banco, não a tela.
--
-- Quem fala com o Google é a Edge Function google-agenda, com as chaves
-- GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET nos secrets do Supabase. Sem elas
-- a integração fica pronta e desligada.

-- Conexões. O refresh token nunca sai do servidor: a tabela não tem
-- política para o app; só a função (service role) lê e grava.
create table if not exists public.beautyos_google (
  empresa_id     uuid        primary key references auth.users(id) on delete cascade,
  refresh_token  text        not null,
  calendario_id  text        not null,
  email          text,
  conectado_em   timestamptz not null default now(),
  ultimo_erro    text
);
alter table public.beautyos_google enable row level security;

-- Estado do OAuth: liga a volta do Google à pessoa que começou a conexão.
create table if not exists public.beautyos_google_estados (
  estado     text        primary key,
  empresa_id uuid        not null references auth.users(id) on delete cascade,
  criado_em  timestamptz not null default now()
);
alter table public.beautyos_google_estados enable row level security;

-- O app só precisa saber se está conectado e com qual conta.
create or replace function public.beautyos_google_status()
returns table (conectado boolean, email text, ultimo_erro text)
language sql stable security definer set search_path = public as $$
  select true, g.email, g.ultimo_erro from public.beautyos_google g where g.empresa_id = auth.uid()
  union all
  select false, null, null where not exists (select 1 from public.beautyos_google g where g.empresa_id = auth.uid())
$$;
revoke all on function public.beautyos_google_status() from public;
grant execute on function public.beautyos_google_status() to authenticated;

alter table public.beautyos_appointments add column if not exists google_evento_id text;

-- Gatilho: a cada mudança de agendamento de quem conectou o Google, avisa a
-- função. Assíncrono (pg_net): a gravação do agendamento não espera o Google.
create extension if not exists pg_net;

create or replace function public.beautyos_google_avisar()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  linha public.beautyos_appointments;
begin
  linha := coalesce(new, old);
  if not exists (select 1 from public.beautyos_google g where g.empresa_id = linha.empresa_id) then
    return null;
  end if;
  -- A própria função grava o id do evento no agendamento: essa mudança
  -- sozinha não volta para o Google, senão seria um laço.
  if tg_op = 'UPDATE'
     and new.google_evento_id is distinct from old.google_evento_id
     and new.date = old.date and new.time = old.time and new.duration = old.duration
     and new.status = old.status and new.service = old.service
     and new.client_id is not distinct from old.client_id
     and new.client_name is not distinct from old.client_name
     and new.notes is not distinct from old.notes then
    return null;
  end if;
  perform net.http_post(
    url     := 'https://filoacckewinytzdlzfg.supabase.co/functions/v1/google-agenda/evento',
    body    := jsonb_build_object(
      'id', linha.id,
      'empresa_id', linha.empresa_id,
      'apagado', tg_op = 'DELETE',
      'evento', old.google_evento_id
    ),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return null;
end;
$$;

drop trigger if exists beautyos_google_avisar on public.beautyos_appointments;
create trigger beautyos_google_avisar
  after insert or update or delete on public.beautyos_appointments
  for each row execute function public.beautyos_google_avisar();

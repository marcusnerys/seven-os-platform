-- Correções da auditoria de 2026-09-23. Cada bloco foi confirmado contra o
-- banco em produção antes de virar migration.

-- ───────────────────────────────────────────────────────────────────────
-- 1. Realtime não entregava DELETE.
--
-- O app assina postgres_changes com filtro empresa_id=eq.<id>. Segundo a
-- documentação do Supabase, evento DELETE só passa por filtro quando a
-- tabela tem REPLICA IDENTITY FULL — com a identidade padrão o registro
-- antigo traz só a chave primária, e o filtro por empresa_id não tem como
-- casar. Verificado: as nove tabelas estavam com relreplident = 'd'.
--
-- Efeito visível: apagar cliente, agendamento, transação, serviço ou
-- notificação não tirava o item da tela até recarregar o app. A pessoa
-- tocava de novo achando que não tinha funcionado.
-- ───────────────────────────────────────────────────────────────────────
alter table public.beautyos_clients              replica identity full;
alter table public.beautyos_appointments         replica identity full;
alter table public.beautyos_transactions         replica identity full;
alter table public.beautyos_services             replica identity full;
alter table public.beautyos_notifications        replica identity full;
alter table public.beautyos_automation_templates replica identity full;

-- ───────────────────────────────────────────────────────────────────────
-- 2. Logo do negócio fora do token de acesso.
--
-- O logo era gravado como data URL base64 em auth user_metadata, e o
-- user_metadata viaja dentro de todo JWT. Verificado em produção: uma conta
-- estava com 174 KB de metadata, ou seja, um cabeçalho Authorization de
-- centenas de KB em cada requisição — acima do que proxies aceitam.
--
-- Agora o arquivo vai para um bucket público do Storage e só a URL é
-- guardada, também em beautyos_settings para a página pública poder exibir.
-- ───────────────────────────────────────────────────────────────────────
alter table public.beautyos_settings add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('beautyos-logos', 'beautyos-logos', true)
on conflict (id) do nothing;

drop policy if exists "beautyos_logos_insert_own" on storage.objects;
create policy "beautyos_logos_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'beautyos-logos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "beautyos_logos_delete_own" on storage.objects;
create policy "beautyos_logos_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'beautyos-logos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ───────────────────────────────────────────────────────────────────────
-- 3. Página pública não recebia tema nem logo.
--
-- A RPC devolvia só studio_name, location e currency. A página lia
-- theme_accent, theme_bg e avatar_url, sempre vazios, e caía no padrão:
-- a identidade que o dono escolhe no onboarding nunca chegava ao cliente.
-- Mudar o tipo de retorno exige recriar a função.
-- ───────────────────────────────────────────────────────────────────────
drop function if exists public.beautyos_public_settings(uuid);

create function public.beautyos_public_settings(p_empresa_id uuid)
returns table(
  studio_name  text,
  location     text,
  currency     text,
  theme_accent text,
  theme_bg     text,
  avatar_url   text
)
language sql
security definer
set search_path = public
stable
as $$
  select studio_name, location, currency, theme_accent, theme_bg, avatar_url
  from beautyos_settings
  where empresa_id = p_empresa_id;
$$;

grant execute on function public.beautyos_public_settings(uuid) to anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────
-- 4. Reserva pública confiava no que o visitante mandava.
--
-- p_price, p_duration e p_service vinham do navegador e eram gravados como
-- chegavam. Com a chave anônima, que é pública, qualquer um chamava a RPC
-- direto: reservava "Corte" por R$ 0,01 — valor que vira receita quando o
-- dono conclui — ou mandava duração de 720 minutos e bloqueava o dia
-- inteiro do negócio numa chamada só.
--
-- Agora o serviço precisa existir no catálogo daquele negócio, e preço e
-- duração saem do catálogo. A assinatura continua a mesma para não quebrar
-- a página publicada; p_price e p_duration são ignorados.
--
-- Mais três ajustes no mesmo caminho:
-- - O limite de 20 reservas por hora contava também os agendamentos que o
--   próprio dono lança. No dia de cadastrar a semana, o link público
--   travava. Passa a contar só reservas públicas (sem cliente vinculado e
--   ainda pendentes de confirmação).
-- - A notificação não dizia o dia do atendimento, só o horário.
-- - Horário, nome e data passam a ser validados no servidor.
-- ───────────────────────────────────────────────────────────────────────
create or replace function public.beautyos_create_appointment_ratelimited(
  p_empresa_id uuid,
  p_client_name text,
  p_client_phone text,
  p_service text,
  p_date date,
  p_time text,
  p_price numeric,
  p_duration integer,
  p_notes text
)
returns json
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_by_phone  int;
  v_by_studio int;
  v_inicio    int;
  v_fim       int;
  v_conflito  int;
  v_servico   text;
  v_preco     numeric;
  v_duracao   int;
  v_hoje      date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not exists (select 1 from beautyos_empresas where id = p_empresa_id) then
    return json_build_object('error', 'estudio_inexistente');
  end if;

  if p_client_name is null or length(trim(p_client_name)) = 0 or length(p_client_name) > 120 then
    return json_build_object('error', 'nome_invalido');
  end if;

  if p_time is null or p_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
    return json_build_object('error', 'horario_invalido');
  end if;

  if p_date is null or p_date > v_hoje + 90 then
    return json_build_object('error', 'data_invalida');
  end if;

  select name, price, coalesce(duration, 60)
    into v_servico, v_preco, v_duracao
  from beautyos_services
  where empresa_id = p_empresa_id and name = p_service
  limit 1;

  if not found then
    return json_build_object('error', 'servico_inexistente');
  end if;

  if v_duracao <= 0 then
    return json_build_object('error', 'duracao_invalida');
  end if;

  if (p_date + p_time::time) < (now() at time zone 'America/Sao_Paulo') then
    return json_build_object('error', 'horario_no_passado');
  end if;

  if p_client_phone is not null and p_client_phone <> '' then
    select count(*) into v_by_phone
    from beautyos_appointments
    where client_phone = p_client_phone
      and empresa_id = p_empresa_id
      and criado_em > now() - interval '1 hour';

    if v_by_phone >= 3 then
      return json_build_object('error', 'rate_limit_phone');
    end if;
  end if;

  select count(*) into v_by_studio
  from beautyos_appointments
  where empresa_id = p_empresa_id
    and client_id is null
    and status = 'Pendente'
    and criado_em > now() - interval '1 hour';

  if v_by_studio >= 20 then
    return json_build_object('error', 'rate_limit_studio');
  end if;

  -- Serializa as reservas deste negócio até o fim da transação.
  perform pg_advisory_xact_lock(hashtextextended(p_empresa_id::text, 0));

  v_inicio := extract(hour from p_time::time) * 60 + extract(minute from p_time::time);
  v_fim    := v_inicio + v_duracao;

  select count(*) into v_conflito
  from beautyos_appointments
  where empresa_id = p_empresa_id
    and date = p_date
    and status <> 'Cancelado'
    and v_inicio < (extract(hour from time::time) * 60 + extract(minute from time::time) + coalesce(duration, 60))
    and v_fim    > (extract(hour from time::time) * 60 + extract(minute from time::time));

  if v_conflito > 0 then
    return json_build_object('error', 'horario_ocupado');
  end if;

  insert into beautyos_appointments (
    empresa_id, client_id, client_name, client_phone,
    service, date, time, price, duration, status, notes
  ) values (
    p_empresa_id, null, trim(p_client_name), p_client_phone,
    v_servico, p_date, p_time, v_preco, v_duracao, 'Pendente', left(p_notes, 500)
  );

  insert into beautyos_notifications (empresa_id, title, message, type, read)
  values (
    p_empresa_id,
    'Nova reserva recebida',
    v_servico || ' • ' || to_char(p_date, 'DD/MM') || ' às ' || p_time || E'\n' || 'Cliente: ' || trim(p_client_name),
    'booking',
    false
  );

  return json_build_object('ok', true);
end;
$function$;

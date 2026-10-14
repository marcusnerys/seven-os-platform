-- 0022: conta compartilhada por convite, com permissões por área.
--
-- Até aqui a empresa era o próprio login do dono (empresa_id = auth.uid()).
-- Agora cada pessoa tem uma linha em beautyos_membros dizendo de qual empresa
-- ela faz parte, com papel (dono/membro) e as áreas que pode ver: agenda,
-- clientes, financeiro e cobrança. O dono vê tudo e é o único que mexe em
-- Configurações, PIX, modelos de mensagem, equipe e convites.
--
-- Uma pessoa participa de uma empresa só. Quem aceita um convite precisa estar
-- com a própria conta vazia; a empresa vazia criada no cadastro é apagada.
--
-- Contas de uma pessoa só não mudam: o backfill faz de cada login o dono da
-- empresa com o mesmo id, e as políticas novas devolvem as mesmas linhas.
--
-- Riscos aceitos (documentados em docs/conta-compartilhada.md):
-- - agenda_token e os campos de PIX ficam legíveis para qualquer membro (a
--   cobrança precisa da chave; o link da agenda é de quem trabalha no negócio);
-- - a cota de IA continua por pessoa (beautyos_ia_uso).

create extension if not exists pgcrypto with schema extensions;

-- ------------------------------------------------------------------
-- Equipe e convites
-- ------------------------------------------------------------------

create table if not exists public.beautyos_membros (
  empresa_id uuid not null references public.beautyos_empresas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  papel text not null default 'membro' check (papel in ('dono', 'membro')),
  areas text[] not null default '{}'
    check (areas <@ array['agenda', 'clientes', 'financeiro', 'cobranca']::text[]),
  nome text,
  email text,
  criado_em timestamptz not null default now(),
  primary key (empresa_id, user_id),
  unique (user_id)
);
alter table public.beautyos_membros enable row level security;

create table if not exists public.beautyos_convites (
  codigo text primary key,
  empresa_id uuid not null references public.beautyos_empresas(id) on delete cascade,
  areas text[] not null
    check (cardinality(areas) > 0 and areas <@ array['agenda', 'clientes', 'financeiro', 'cobranca']::text[]),
  nome text,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default now() + interval '7 days',
  usado_por uuid references auth.users(id) on delete set null,
  usado_em timestamptz
);
alter table public.beautyos_convites enable row level security;
create index if not exists beautyos_convites_empresa_idx on public.beautyos_convites (empresa_id);

-- Todo login atual vira dono da empresa de mesmo id.
insert into public.beautyos_membros (empresa_id, user_id, papel, areas, email)
select e.id, e.id, 'dono', array['agenda', 'clientes', 'financeiro', 'cobranca'], u.email
from public.beautyos_empresas e
join auth.users u on u.id = e.id
on conflict do nothing;

-- ------------------------------------------------------------------
-- Funções de acesso usadas pelas políticas. Sem argumento de linha, o
-- Postgres avalia cada uma uma vez por consulta quando vem em (select ...).
-- ------------------------------------------------------------------

create or replace function public.beautyos_empresa_atual()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select m.empresa_id from public.beautyos_membros m where m.user_id = auth.uid()
$$;

create or replace function public.beautyos_sou_dono()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.beautyos_membros m where m.user_id = auth.uid() and m.papel = 'dono')
$$;

-- Verdadeiro se a pessoa é dona ou tem pelo menos uma das áreas pedidas.
create or replace function public.beautyos_tenho_area(p_areas text[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.beautyos_membros m
    where m.user_id = auth.uid() and (m.papel = 'dono' or m.areas && p_areas)
  )
$$;

revoke all on function public.beautyos_empresa_atual() from public, anon;
revoke all on function public.beautyos_sou_dono() from public, anon;
revoke all on function public.beautyos_tenho_area(text[]) from public, anon;
grant execute on function public.beautyos_empresa_atual() to authenticated;
grant execute on function public.beautyos_sou_dono() to authenticated;
grant execute on function public.beautyos_tenho_area(text[]) to authenticated;

-- ------------------------------------------------------------------
-- Políticas novas
-- ------------------------------------------------------------------

-- Empresa: membros leem; só o dono altera ou exclui. A criação é do gatilho.
drop policy if exists "empresa_self_access" on public.beautyos_empresas;
create policy "empresa_membros_leem" on public.beautyos_empresas
  for select to authenticated using (id = (select public.beautyos_empresa_atual()));
create policy "empresa_dono_altera" on public.beautyos_empresas
  for update to authenticated
  using (id = (select public.beautyos_empresa_atual()) and (select public.beautyos_sou_dono()))
  with check (id = (select public.beautyos_empresa_atual()));
create policy "empresa_dono_exclui" on public.beautyos_empresas
  for delete to authenticated
  using (id = (select public.beautyos_empresa_atual()) and (select public.beautyos_sou_dono()));

-- Clientes: quem cuida de clientes, agenda ou cobrança lê; clientes e agenda
-- gravam (marcar horário cria cliente; concluir atualiza gasto e visitas);
-- só a área de clientes exclui.
drop policy if exists "clients_tenant_isolation" on public.beautyos_clients;
create policy "clients_ler" on public.beautyos_clients
  for select to authenticated
  using (empresa_id = (select public.beautyos_empresa_atual())
    and (select public.beautyos_tenho_area(array['clientes', 'agenda', 'cobranca'])));
create policy "clients_criar" on public.beautyos_clients
  for insert to authenticated
  with check (empresa_id = (select public.beautyos_empresa_atual())
    and (select public.beautyos_tenho_area(array['clientes', 'agenda'])));
create policy "clients_alterar" on public.beautyos_clients
  for update to authenticated
  using (empresa_id = (select public.beautyos_empresa_atual())
    and (select public.beautyos_tenho_area(array['clientes', 'agenda'])))
  with check (empresa_id = (select public.beautyos_empresa_atual()));
create policy "clients_excluir" on public.beautyos_clients
  for delete to authenticated
  using (empresa_id = (select public.beautyos_empresa_atual())
    and (select public.beautyos_tenho_area(array['clientes'])));

-- Serviços: todos da equipe leem (preço aparece na agenda e na cobrança);
-- a agenda mantém o catálogo.
drop policy if exists "services_tenant_isolation" on public.beautyos_services;
create policy "services_ler" on public.beautyos_services
  for select to authenticated using (empresa_id = (select public.beautyos_empresa_atual()));
create policy "services_gravar" on public.beautyos_services
  for all to authenticated
  using (empresa_id = (select public.beautyos_empresa_atual())
    and (select public.beautyos_tenho_area(array['agenda'])))
  with check (empresa_id = (select public.beautyos_empresa_atual())
    and (select public.beautyos_tenho_area(array['agenda'])));

-- Agendamentos: agenda e clientes leem (histórico do cliente); a agenda grava.
drop policy if exists "appointments_tenant_isolation" on public.beautyos_appointments;
create policy "appointments_ler" on public.beautyos_appointments
  for select to authenticated
  using (empresa_id = (select public.beautyos_empresa_atual())
    and (select public.beautyos_tenho_area(array['agenda', 'clientes'])));
create policy "appointments_gravar" on public.beautyos_appointments
  for all to authenticated
  using (empresa_id = (select public.beautyos_empresa_atual())
    and (select public.beautyos_tenho_area(array['agenda'])))
  with check (empresa_id = (select public.beautyos_empresa_atual())
    and (select public.beautyos_tenho_area(array['agenda'])));

-- Financeiro: só quem tem a área lê e altera. A agenda pode lançar receita
-- (concluir atendimento), sem enxergar o resto.
drop policy if exists "transactions_tenant_isolation" on public.beautyos_transactions;
create policy "transactions_financeiro" on public.beautyos_transactions
  for all to authenticated
  using (empresa_id = (select public.beautyos_empresa_atual())
    and (select public.beautyos_tenho_area(array['financeiro'])))
  with check (empresa_id = (select public.beautyos_empresa_atual())
    and (select public.beautyos_tenho_area(array['financeiro'])));
create policy "transactions_agenda_lanca_receita" on public.beautyos_transactions
  for insert to authenticated
  with check (empresa_id = (select public.beautyos_empresa_atual())
    and type = 'revenue'
    and (select public.beautyos_tenho_area(array['agenda'])));

drop policy if exists "recorrentes_dono" on public.beautyos_recorrentes;
create policy "recorrentes_financeiro" on public.beautyos_recorrentes
  for all to authenticated
  using (empresa_id = (select public.beautyos_empresa_atual())
    and (select public.beautyos_tenho_area(array['financeiro'])))
  with check (empresa_id = (select public.beautyos_empresa_atual())
    and (select public.beautyos_tenho_area(array['financeiro'])));

drop policy if exists "importacoes_dono" on public.beautyos_importacoes;
create policy "importacoes_financeiro" on public.beautyos_importacoes
  for all to authenticated
  using (empresa_id = (select public.beautyos_empresa_atual())
    and (select public.beautyos_tenho_area(array['financeiro'])))
  with check (empresa_id = (select public.beautyos_empresa_atual())
    and (select public.beautyos_tenho_area(array['financeiro'])));

-- Fixos e extratos passam a nascer na empresa da pessoa, não no login dela,
-- e somem junto com a empresa.
alter table public.beautyos_recorrentes alter column empresa_id set default public.beautyos_empresa_atual();
alter table public.beautyos_importacoes alter column empresa_id set default public.beautyos_empresa_atual();
alter table public.beautyos_recorrentes drop constraint if exists beautyos_recorrentes_empresa_id_fkey;
alter table public.beautyos_recorrentes add constraint beautyos_recorrentes_empresa_id_fkey
  foreign key (empresa_id) references public.beautyos_empresas(id) on delete cascade;
alter table public.beautyos_importacoes drop constraint if exists beautyos_importacoes_empresa_id_fkey;
alter table public.beautyos_importacoes add constraint beautyos_importacoes_empresa_id_fkey
  foreign key (empresa_id) references public.beautyos_empresas(id) on delete cascade;

-- Avisos: toda a equipe; os financeiros só para quem tem o financeiro. Criar
-- é livre na equipe: concluir um atendimento (agenda) avisa a receita.
drop policy if exists "notifications_tenant_isolation" on public.beautyos_notifications;
create policy "notifications_ler" on public.beautyos_notifications
  for select to authenticated
  using (empresa_id = (select public.beautyos_empresa_atual())
    and (type <> 'financial' or (select public.beautyos_tenho_area(array['financeiro']))));
create policy "notifications_criar" on public.beautyos_notifications
  for insert to authenticated
  with check (empresa_id = (select public.beautyos_empresa_atual()));
create policy "notifications_alterar" on public.beautyos_notifications
  for update to authenticated
  using (empresa_id = (select public.beautyos_empresa_atual())
    and (type <> 'financial' or (select public.beautyos_tenho_area(array['financeiro']))))
  with check (empresa_id = (select public.beautyos_empresa_atual()));
create policy "notifications_excluir" on public.beautyos_notifications
  for delete to authenticated
  using (empresa_id = (select public.beautyos_empresa_atual())
    and (type <> 'financial' or (select public.beautyos_tenho_area(array['financeiro']))));

-- O cliente de um agendamento tem de ser da mesma empresa. A chave estrangeira
-- não confere isso, e quem já fez parte de outra equipe conhece ids de lá.
create or replace function public.beautyos_cliente_da_mesma_empresa()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.client_id is not null and not exists (
    select 1 from public.beautyos_clients c where c.id = new.client_id and c.empresa_id = new.empresa_id
  ) then
    raise exception 'cliente_de_outra_empresa';
  end if;
  return new;
end;
$$;
revoke all on function public.beautyos_cliente_da_mesma_empresa() from public, anon, authenticated;
drop trigger if exists beautyos_appointments_cliente_mesma_empresa on public.beautyos_appointments;
create trigger beautyos_appointments_cliente_mesma_empresa
  before insert or update of client_id, empresa_id on public.beautyos_appointments
  for each row execute function public.beautyos_cliente_da_mesma_empresa();

-- Modelos de mensagem: equipe lê (as automações usam); só o dono edita.
drop policy if exists "automation_templates_tenant_isolation" on public.beautyos_automation_templates;
create policy "automation_templates_ler" on public.beautyos_automation_templates
  for select to authenticated using (empresa_id = (select public.beautyos_empresa_atual()));
create policy "automation_templates_dono" on public.beautyos_automation_templates
  for all to authenticated
  using (empresa_id = (select public.beautyos_empresa_atual()) and (select public.beautyos_sou_dono()))
  with check (empresa_id = (select public.beautyos_empresa_atual()) and (select public.beautyos_sou_dono()));

-- Registro de envios: compartilhado, para dois aparelhos não mandarem a mesma mensagem.
drop policy if exists "automation_logs_tenant_isolation" on public.beautyos_automation_logs;
create policy "automation_logs_equipe" on public.beautyos_automation_logs
  for all to authenticated
  using (empresa_id = (select public.beautyos_empresa_atual()))
  with check (empresa_id = (select public.beautyos_empresa_atual()));

-- Configurações (inclui PIX e link da agenda): equipe lê; só o dono grava.
drop policy if exists "settings_tenant_isolation" on public.beautyos_settings;
create policy "settings_ler" on public.beautyos_settings
  for select to authenticated using (empresa_id = (select public.beautyos_empresa_atual()));
create policy "settings_dono_cria" on public.beautyos_settings
  for insert to authenticated
  with check (empresa_id = (select public.beautyos_empresa_atual()) and (select public.beautyos_sou_dono()));
create policy "settings_dono_altera" on public.beautyos_settings
  for update to authenticated
  using (empresa_id = (select public.beautyos_empresa_atual()) and (select public.beautyos_sou_dono()))
  with check (empresa_id = (select public.beautyos_empresa_atual()));

-- Equipe: cada um vê quem trabalha na mesma empresa. Mudanças só pelas funções abaixo.
create policy "membros_ler" on public.beautyos_membros
  for select to authenticated using (empresa_id = (select public.beautyos_empresa_atual()));

-- Convites: só o dono vê os da empresa. Criar e usar só pelas funções abaixo.
create policy "convites_dono_le" on public.beautyos_convites
  for select to authenticated
  using (empresa_id = (select public.beautyos_empresa_atual()) and (select public.beautyos_sou_dono()));

revoke insert, update, delete, truncate, references on public.beautyos_membros, public.beautyos_convites from anon, authenticated;
revoke all on public.beautyos_membros, public.beautyos_convites from anon;

-- Google Agenda: o status passa a ser o da empresa, não o do login. O app usa a
-- Edge Function (que só mostra o e-mail ao dono); a chamada direta fica fechada.
create or replace function public.beautyos_google_status()
returns table(conectado boolean, email text, ultimo_erro text)
language sql stable security definer set search_path = public
as $$
  select true, g.email, g.ultimo_erro from public.beautyos_google g where g.empresa_id = public.beautyos_empresa_atual()
  union all
  select false, null, null where not exists (
    select 1 from public.beautyos_google g where g.empresa_id = public.beautyos_empresa_atual()
  )
$$;
revoke all on function public.beautyos_google_status() from public, anon, authenticated;

-- ------------------------------------------------------------------
-- Cadastro: além da empresa e das configurações, a pessoa vira dona dela.
-- ------------------------------------------------------------------

create or replace function public.handle_new_beautyos_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.beautyos_empresas (id) values (new.id) on conflict (id) do nothing;
  insert into public.beautyos_settings (empresa_id) values (new.id) on conflict (empresa_id) do nothing;
  perform public.beautyos_seed_automation_templates(new.id);
  insert into public.beautyos_membros (empresa_id, user_id, papel, areas, email)
  values (new.id, new.id, 'dono', array['agenda', 'clientes', 'financeiro', 'cobranca'], new.email)
  on conflict do nothing;
  return new;
end;
$$;

-- Funções internas não podem ser chamadas pela API (antes, qualquer visitante
-- conseguia semear modelos de mensagem em qualquer empresa).
revoke all on function public.beautyos_seed_automation_templates(uuid) from public, anon, authenticated;
revoke all on function public.handle_new_beautyos_user() from public, anon, authenticated;
revoke all on function public.beautyos_google_avisar() from public, anon, authenticated;

-- ------------------------------------------------------------------
-- Funções da equipe (chamadas pelo app)
-- ------------------------------------------------------------------

-- Garante que quem está logado faça parte de alguma empresa. Quem foi removido
-- de uma equipe, ou saiu dela, ganha de novo uma empresa própria e vazia.
create or replace function public.beautyos_garantir_empresa()
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_empresa uuid;
begin
  if v_uid is null then raise exception 'sem_login'; end if;
  select m.empresa_id into v_empresa from public.beautyos_membros m where m.user_id = v_uid;
  if v_empresa is not null then return v_empresa; end if;

  insert into public.beautyos_empresas (id) values (v_uid) on conflict (id) do nothing;
  insert into public.beautyos_settings (empresa_id) values (v_uid) on conflict (empresa_id) do nothing;
  if not exists (select 1 from public.beautyos_automation_templates t where t.empresa_id = v_uid) then
    perform public.beautyos_seed_automation_templates(v_uid);
  end if;
  insert into public.beautyos_membros (empresa_id, user_id, papel, areas, email)
  values (v_uid, v_uid, 'dono', array['agenda', 'clientes', 'financeiro', 'cobranca'], auth.jwt() ->> 'email');
  return v_uid;
end;
$$;

create or replace function public.beautyos_criar_convite(p_areas text[], p_nome text default null)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_empresa uuid := public.beautyos_empresa_atual();
  v_codigo text;
begin
  if not public.beautyos_sou_dono() then raise exception 'so_dono'; end if;
  if p_areas is null or cardinality(p_areas) = 0
     or not (p_areas <@ array['agenda', 'clientes', 'financeiro', 'cobranca']::text[]) then
    raise exception 'areas_invalidas';
  end if;
  if (select count(*) from public.beautyos_convites c
      where c.empresa_id = v_empresa and c.usado_em is null and c.expira_em > now()) >= 20 then
    raise exception 'convites_demais';
  end if;
  -- 10 caracteres de um alfabeto sem letras e números parecidos (sem 0/O, 1/I/L).
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (get_byte(b, i) % 31) + 1, 1), '' order by i)
    into v_codigo
  from (select extensions.gen_random_bytes(10) as b) r, generate_series(0, 9) i;
  insert into public.beautyos_convites (codigo, empresa_id, areas, nome, criado_por)
  values (v_codigo, v_empresa, (select array_agg(distinct a order by a) from unnest(p_areas) a),
          nullif(trim(p_nome), ''), auth.uid());
  return v_codigo;
end;
$$;

-- Mostra a quem recebeu o código de qual negócio é o convite, antes de aceitar.
create or replace function public.beautyos_ver_convite(p_codigo text)
returns table(empresa text, areas text[])
language sql stable security definer set search_path = ''
as $$
  select s.studio_name, c.areas
  from public.beautyos_convites c
  join public.beautyos_settings s on s.empresa_id = c.empresa_id
  where c.codigo = upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g'))
    and c.usado_em is null and c.expira_em > now()
$$;

create or replace function public.beautyos_aceitar_convite(p_codigo text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_convite public.beautyos_convites%rowtype;
  v_atual public.beautyos_membros%rowtype;
begin
  if v_uid is null then raise exception 'sem_login'; end if;
  select * into v_convite from public.beautyos_convites c
  where c.codigo = upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g'))
  for update;
  if not found or v_convite.usado_em is not null or v_convite.expira_em <= now() then
    raise exception 'convite_invalido';
  end if;

  select * into v_atual from public.beautyos_membros m where m.user_id = v_uid;
  if found then
    if v_atual.empresa_id = v_convite.empresa_id then raise exception 'ja_na_equipe'; end if;
    if v_atual.papel <> 'dono' then raise exception 'ja_em_outra_equipe'; end if;
    -- A conta de quem aceita precisa estar vazia: nada se perde ao trocar de empresa.
    if exists (select 1 from public.beautyos_membros m where m.empresa_id = v_atual.empresa_id and m.user_id <> v_uid)
       or exists (select 1 from public.beautyos_clients x where x.empresa_id = v_atual.empresa_id)
       or exists (select 1 from public.beautyos_appointments x where x.empresa_id = v_atual.empresa_id)
       or exists (select 1 from public.beautyos_transactions x where x.empresa_id = v_atual.empresa_id)
       or exists (select 1 from public.beautyos_services x where x.empresa_id = v_atual.empresa_id)
       or exists (select 1 from public.beautyos_recorrentes x where x.empresa_id = v_atual.empresa_id)
       or exists (select 1 from public.beautyos_importacoes x where x.empresa_id = v_atual.empresa_id) then
      raise exception 'conta_com_dados';
    end if;
    -- A conexão com o Google precisa ser desfeita pelo app (revoga o token no Google).
    if exists (select 1 from public.beautyos_google g where g.empresa_id = v_atual.empresa_id) then
      raise exception 'conta_com_google';
    end if;
    delete from public.beautyos_google_estados g where g.empresa_id = v_atual.empresa_id;
    delete from public.beautyos_google g where g.empresa_id = v_atual.empresa_id;
    delete from public.beautyos_empresas e where e.id = v_atual.empresa_id;
  end if;

  insert into public.beautyos_membros (empresa_id, user_id, papel, areas, nome, email)
  values (v_convite.empresa_id, v_uid, 'membro', v_convite.areas, v_convite.nome, auth.jwt() ->> 'email');
  update public.beautyos_convites set usado_por = v_uid, usado_em = now() where codigo = v_convite.codigo;
  return v_convite.empresa_id;
end;
$$;

create or replace function public.beautyos_cancelar_convite(p_codigo text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.beautyos_sou_dono() then raise exception 'so_dono'; end if;
  delete from public.beautyos_convites c
  where c.codigo = p_codigo and c.empresa_id = public.beautyos_empresa_atual() and c.usado_em is null;
end;
$$;

create or replace function public.beautyos_atualizar_membro(p_user uuid, p_areas text[], p_nome text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.beautyos_sou_dono() then raise exception 'so_dono'; end if;
  if p_areas is null or not (p_areas <@ array['agenda', 'clientes', 'financeiro', 'cobranca']::text[]) then
    raise exception 'areas_invalidas';
  end if;
  update public.beautyos_membros m
  set areas = (select coalesce(array_agg(distinct a order by a), '{}') from unnest(p_areas) a),
      nome = coalesce(nullif(trim(p_nome), ''), m.nome)
  where m.user_id = p_user and m.empresa_id = public.beautyos_empresa_atual() and m.papel = 'membro';
  if not found then raise exception 'membro_nao_encontrado'; end if;
end;
$$;

-- Quem sai da equipe pode ter guardado o link da agenda (assinatura de
-- calendário, que não passa pelo RLS): o link é trocado na saída.
create or replace function public.beautyos_trocar_link_da_agenda(p_empresa uuid)
returns void
language sql security definer set search_path = ''
as $$
  update public.beautyos_settings set agenda_token = gen_random_uuid() where empresa_id = p_empresa
$$;
revoke all on function public.beautyos_trocar_link_da_agenda(uuid) from public, anon, authenticated;

create or replace function public.beautyos_remover_membro(p_user uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.beautyos_sou_dono() then raise exception 'so_dono'; end if;
  delete from public.beautyos_membros m
  where m.user_id = p_user and m.empresa_id = public.beautyos_empresa_atual() and m.papel = 'membro';
  if not found then raise exception 'membro_nao_encontrado'; end if;
  perform public.beautyos_trocar_link_da_agenda(public.beautyos_empresa_atual());
end;
$$;

-- Quem é membro sai da equipe e volta a ter uma empresa própria e vazia.
create or replace function public.beautyos_sair_da_equipe()
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_empresa uuid;
begin
  delete from public.beautyos_membros m where m.user_id = auth.uid() and m.papel = 'membro'
  returning m.empresa_id into v_empresa;
  if v_empresa is null then raise exception 'nao_e_membro'; end if;
  perform public.beautyos_trocar_link_da_agenda(v_empresa);
  return public.beautyos_garantir_empresa();
end;
$$;

revoke all on function public.beautyos_garantir_empresa() from public, anon;
revoke all on function public.beautyos_criar_convite(text[], text) from public, anon;
revoke all on function public.beautyos_ver_convite(text) from public, anon;
revoke all on function public.beautyos_aceitar_convite(text) from public, anon;
revoke all on function public.beautyos_cancelar_convite(text) from public, anon;
revoke all on function public.beautyos_atualizar_membro(uuid, text[], text) from public, anon;
revoke all on function public.beautyos_remover_membro(uuid) from public, anon;
revoke all on function public.beautyos_sair_da_equipe() from public, anon;
grant execute on function public.beautyos_garantir_empresa() to authenticated;
grant execute on function public.beautyos_criar_convite(text[], text) to authenticated;
grant execute on function public.beautyos_ver_convite(text) to authenticated;
grant execute on function public.beautyos_aceitar_convite(text) to authenticated;
grant execute on function public.beautyos_cancelar_convite(text) to authenticated;
grant execute on function public.beautyos_atualizar_membro(uuid, text[], text) to authenticated;
grant execute on function public.beautyos_remover_membro(uuid) to authenticated;
grant execute on function public.beautyos_sair_da_equipe() to authenticated;

-- Envios de automação feitos em outro aparelho chegam na hora. A equipe
-- (beautyos_membros) fica fora do realtime: os eventos de exclusão não passam
-- pelo RLS e mostrariam a qualquer conta quem trabalha em qual negócio. O app
-- relê a equipe sempre que volta para a tela.
do $$
declare
  t text;
begin
  foreach t in array array['beautyos_automation_logs'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

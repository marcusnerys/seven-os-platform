-- Agenda assinável pelo calendário do celular.
--
-- "Exportar Agenda" baixava um arquivo .ics com o que existia naquele
-- momento: agendamento novo, remarcado ou cancelado depois não chegava ao
-- calendário. Um link de assinatura resolve: o calendário do iPhone ou do
-- Google busca a agenda sozinho de tempos em tempos.
--
-- Calendário não manda login, então o link carrega um segredo por negócio.
-- É o mesmo modelo do "endereço secreto" do Google Agenda: quem tem o link
-- vê a agenda. O dono troca o segredo quando quiser (a própria linha de
-- beautyos_settings já é editável por ele pela política existente).

alter table public.beautyos_settings
  add column if not exists agenda_token uuid not null default gen_random_uuid();

create unique index if not exists beautyos_settings_agenda_token_key
  on public.beautyos_settings (agenda_token);

-- Lida pela função /api/agenda com a chave pública. Devolve só o necessário
-- para o calendário, do negócio dono do segredo, de 30 dias atrás em diante,
-- sem cancelados.
create or replace function public.beautyos_agenda_calendario(p_token uuid)
returns table (
  id          uuid,
  data        date,
  hora        text,
  duracao     integer,
  servico     text,
  cliente     text,
  status      text,
  observacao  text,
  negocio     text
)
language sql
stable
security definer
set search_path = public
as $$
  select a.id,
         a.date,
         a.time,
         a.duration,
         a.service,
         coalesce(c.name, a.client_name, 'Cliente'),
         a.status,
         a.notes,
         s.studio_name
  from public.beautyos_settings s
  join public.beautyos_appointments a on a.empresa_id = s.empresa_id
  left join public.beautyos_clients c on c.id = a.client_id and c.empresa_id = s.empresa_id
  where s.agenda_token = p_token
    and a.status <> 'Cancelado'
    and a.date >= current_date - 30
  order by a.date, a.time
  limit 3000;
$$;

revoke all on function public.beautyos_agenda_calendario(uuid) from public;
grant execute on function public.beautyos_agenda_calendario(uuid) to anon, authenticated;

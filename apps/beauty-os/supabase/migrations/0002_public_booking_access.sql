-- Acesso público (anônimo) restrito para a página de agendamento online
-- (BookingPage.tsx), que roda sem sessão autenticada.

-- Catálogo de serviços e nome/local do estúdio são informação pública por natureza.
create policy "services_public_read" on beautyos_services
  for select to anon using (true);

create policy "settings_public_read" on beautyos_settings
  for select to anon using (true);

-- View restrita: expõe só data/hora/duração dos agendamentos não cancelados,
-- para checagem de conflito de horário — nunca nome/telefone/notas do cliente.
create view beautyos_public_slots as
  select empresa_id, date, time, duration
  from beautyos_appointments
  where status <> 'Cancelado';

grant select on beautyos_public_slots to anon;

-- Cliente anônimo pode criar uma solicitação de agendamento, mas só como
-- 'Pendente' e sem poder vincular a um client_id existente (evita
-- impersonar clientes já cadastrados).
create policy "appointments_public_insert" on beautyos_appointments
  for insert to anon
  with check (client_id is null and status = 'Pendente');

-- Cliente anônimo pode notificar o estúdio sobre a própria reserva, mas só
-- notificações do tipo 'booking' e já marcadas como não lidas.
create policy "notifications_public_insert" on beautyos_notifications
  for insert to anon
  with check (type = 'booking' and read = false);

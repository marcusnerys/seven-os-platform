-- Teste das regras de acesso da conta compartilhada (migration 0022).
--
-- Roda depois da migration, na MESMA transação, e termina sempre com erro
-- ("RESULTADO ..."): o erro desfaz tudo, inclusive a migration, sem tocar em
-- dado real. Cada linha do resultado é "ok" ou "FALHOU".
--
-- Uso: (begin; <0022_conta_compartilhada.sql>; <este arquivo>) num único envio.

do $$
declare
  dono uuid := gen_random_uuid();
  ag uuid := gen_random_uuid();
  fin uuid := gen_random_uuid();
  est uuid := gen_random_uuid();
  cheio uuid := gen_random_uuid();
  gg uuid := gen_random_uuid();
  tok uuid;
  cod_gg text;
  res text[] := '{}';
  falhas int := 0;
  n int;
  esperado int;
  cod_ag text;
  cod_fin text;
  cod_cheio text;
  v uuid;
  msg text;
  emp record;
begin
  -- Pessoas de teste (o gatilho de cadastro cria empresa, configurações e dono).
  insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  select '00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated', u::text || '@teste.invalid', '{}', '{}', now(), now()
  from unnest(array[dono, ag, fin, est, cheio, gg]) u;
  insert into public.beautyos_google (empresa_id, refresh_token, calendario_id, email) values (gg, 'x', 'y', 'gg@teste.invalid');

  insert into public.beautyos_clients (empresa_id, name, phone) values (dono, 'Ana Teste', '11999990000');
  insert into public.beautyos_clients (empresa_id, name, phone) values (cheio, 'Cliente Cheio', '11999990001');
  insert into public.beautyos_services (empresa_id, name, price, duration) values (dono, 'Corte Teste', 80, 30);
  insert into public.beautyos_appointments (empresa_id, client_name, service, date, time, price, duration, status)
  values (dono, 'Ana Teste', 'Corte Teste', current_date, '10:00', 80, 30, 'Confirmado');
  insert into public.beautyos_transactions (empresa_id, amount, type, category, date, description)
  values (dono, 80, 'revenue', 'Serviços', current_date, 'Corte'), (dono, 50, 'expense', 'Contas', current_date, 'Luz');
  insert into public.beautyos_recorrentes (empresa_id, tipo, descricao, valor, dia, inicio)
  values (dono, 'fixo', 'Aluguel', 1000, 5, to_char(current_date, 'YYYY-MM'));
  insert into public.beautyos_notifications (empresa_id, title, message, type)
  values (dono, 'Novo agendamento', 'x', 'booking'), (dono, 'Meta batida', 'x', 'financial');
  update public.beautyos_settings set pix_chave = 'dono@teste.invalid', studio_name = 'Studio Teste' where empresa_id = dono;

  -- 1. Todo cadastro novo vira dono da própria empresa.
  select count(*) into n from public.beautyos_membros where user_id in (dono, ag, fin, est, cheio, gg) and papel = 'dono' and empresa_id = user_id;
  res := res || format('%s cadastro cria dono (6 = %s)', case when n = 6 then 'ok' else 'FALHOU' end, n);

  -- 2. O dono cria convites.
  perform set_config('request.jwt.claims', json_build_object('sub', dono, 'role', 'authenticated', 'email', 'dono@teste.invalid')::text, true);
  execute 'set local role authenticated';
  cod_ag := public.beautyos_criar_convite(array['agenda'], 'Ana Agenda');
  cod_fin := public.beautyos_criar_convite(array['financeiro', 'financeiro'], null);
  cod_cheio := public.beautyos_criar_convite(array['clientes'], null);
  cod_gg := public.beautyos_criar_convite(array['agenda'], null);
  select count(*) into n from public.beautyos_convites;
  execute 'reset role';
  res := res || format('%s dono cria e vê 4 convites (%s), código %s', case when n = 4 and length(cod_ag) = 10 then 'ok' else 'FALHOU' end, n, cod_ag);

  -- 3. Quem tem a conta vazia aceita; a empresa vazia some.
  perform set_config('request.jwt.claims', json_build_object('sub', ag, 'role', 'authenticated', 'email', 'ag@teste.invalid')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.beautyos_ver_convite(lower(substr(cod_ag, 1, 5)) || '-' || substr(cod_ag, 6));
  v := public.beautyos_aceitar_convite(cod_ag);
  execute 'reset role';
  res := res || format('%s convite visível antes de aceitar, com hífen e minúsculas (%s)', case when n = 1 then 'ok' else 'FALHOU' end, n);
  res := res || format('%s agenda entrou na empresa do dono', case when v = dono then 'ok' else 'FALHOU' end);
  select count(*) into n from public.beautyos_empresas where id = ag;
  res := res || format('%s empresa vazia da agenda apagada (%s)', case when n = 0 then 'ok' else 'FALHOU' end, n);

  perform set_config('request.jwt.claims', json_build_object('sub', fin, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  v := public.beautyos_aceitar_convite(cod_fin);
  execute 'reset role';

  -- 4. Conta com dados não pode aceitar; convite usado não serve de novo.
  perform set_config('request.jwt.claims', json_build_object('sub', cheio, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.beautyos_aceitar_convite(cod_cheio);
    msg := 'aceitou';
  exception when others then msg := sqlerrm;
  end;
  execute 'reset role';
  res := res || format('%s conta com dados recusada (%s)', case when msg = 'conta_com_dados' then 'ok' else 'FALHOU' end, msg);

  perform set_config('request.jwt.claims', json_build_object('sub', gg, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.beautyos_aceitar_convite(cod_gg);
    msg := 'aceitou';
  exception when others then msg := sqlerrm;
  end;
  begin
    perform * from public.beautyos_google_status();
    msg := msg || ', status aberto';
  exception when others then msg := msg || ', status fechado';
  end;
  execute 'reset role';
  res := res || format('%s conta ligada ao Google recusada e status do Google fechado (%s)', case when msg = 'conta_com_google, status fechado' then 'ok' else 'FALHOU' end, msg);

  perform set_config('request.jwt.claims', json_build_object('sub', est, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.beautyos_aceitar_convite(cod_ag);
    msg := 'aceitou';
  exception when others then msg := sqlerrm;
  end;
  select count(*) into n from public.beautyos_ver_convite(cod_ag);
  execute 'reset role';
  res := res || format('%s convite usado recusado (%s) e invisível (%s)', case when msg = 'convite_invalido' and n = 0 then 'ok' else 'FALHOU' end, msg, n);

  -- 5. Agenda: vê clientes, serviços e horários; não vê o financeiro; lança receita, não despesa.
  perform set_config('request.jwt.claims', json_build_object('sub', ag, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.beautyos_clients;
  res := res || format('%s agenda vê 1 cliente (%s)', case when n = 1 then 'ok' else 'FALHOU' end, n);
  select count(*) into n from public.beautyos_appointments;
  res := res || format('%s agenda vê 1 horário (%s)', case when n = 1 then 'ok' else 'FALHOU' end, n);
  select count(*) into n from public.beautyos_services;
  res := res || format('%s agenda vê 1 serviço (%s)', case when n = 1 then 'ok' else 'FALHOU' end, n);
  select count(*) into n from public.beautyos_transactions;
  res := res || format('%s agenda não vê transações (%s)', case when n = 0 then 'ok' else 'FALHOU' end, n);
  select count(*) into n from public.beautyos_recorrentes;
  res := res || format('%s agenda não vê fixos (%s)', case when n = 0 then 'ok' else 'FALHOU' end, n);
  select count(*) into n from public.beautyos_notifications;
  res := res || format('%s agenda vê só o aviso não financeiro (%s)', case when n = 1 then 'ok' else 'FALHOU' end, n);
  select count(*) into n from public.beautyos_membros;
  res := res || format('%s agenda vê a equipe de 3 (%s)', case when n = 3 then 'ok' else 'FALHOU' end, n);
  select count(*) into n from public.beautyos_convites;
  res := res || format('%s agenda não vê convites (%s)', case when n = 0 then 'ok' else 'FALHOU' end, n);
  insert into public.beautyos_appointments (empresa_id, client_name, service, date, time, price, duration, status)
  values (public.beautyos_empresa_atual(), 'Ana Teste', 'Corte Teste', current_date, '11:00', 80, 30, 'Confirmado');
  insert into public.beautyos_transactions (empresa_id, amount, type, category, date, description)
  values (public.beautyos_empresa_atual(), 80, 'revenue', 'Serviços', current_date, 'Corte concluído');
  res := res || 'ok agenda marca horário e lança receita'::text;
  begin
    insert into public.beautyos_transactions (empresa_id, amount, type, category, date, description)
    values (public.beautyos_empresa_atual(), 10, 'expense', 'Contas', current_date, 'Indevida');
    msg := 'gravou';
  exception when others then msg := 'bloqueada';
  end;
  res := res || format('%s agenda não lança despesa (%s)', case when msg = 'bloqueada' then 'ok' else 'FALHOU' end, msg);
  update public.beautyos_settings set pix_chave = 'golpe@teste.invalid';
  delete from public.beautyos_clients;
  begin
    perform public.beautyos_criar_convite(array['financeiro'], null);
    msg := 'criou';
  exception when others then msg := sqlerrm;
  end;
  execute 'reset role';
  select count(*) into n from public.beautyos_settings where empresa_id = dono and pix_chave = 'dono@teste.invalid';
  res := res || format('%s agenda não troca a chave PIX (%s)', case when n = 1 then 'ok' else 'FALHOU' end, n);
  select count(*) into n from public.beautyos_clients where empresa_id = dono;
  res := res || format('%s agenda não exclui clientes (%s)', case when n = 1 then 'ok' else 'FALHOU' end, n);
  res := res || format('%s agenda não cria convite (%s)', case when msg = 'so_dono' then 'ok' else 'FALHOU' end, msg);

  -- 6. Financeiro: vê dinheiro, não vê clientes nem agenda.
  perform set_config('request.jwt.claims', json_build_object('sub', fin, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.beautyos_transactions;
  res := res || format('%s financeiro vê 3 transações (%s)', case when n = 3 then 'ok' else 'FALHOU' end, n);
  select count(*) into n from public.beautyos_recorrentes;
  res := res || format('%s financeiro vê 1 fixo (%s)', case when n = 1 then 'ok' else 'FALHOU' end, n);
  select count(*) into n from public.beautyos_notifications;
  res := res || format('%s financeiro vê os 2 avisos (%s)', case when n = 2 then 'ok' else 'FALHOU' end, n);
  select count(*) into n from public.beautyos_clients;
  res := res || format('%s financeiro não vê clientes (%s)', case when n = 0 then 'ok' else 'FALHOU' end, n);
  select count(*) into n from public.beautyos_appointments;
  res := res || format('%s financeiro não vê horários (%s)', case when n = 0 then 'ok' else 'FALHOU' end, n);
  insert into public.beautyos_recorrentes (tipo, descricao, valor, dia, inicio) values ('fixo', 'Internet', 100, 10, to_char(current_date, 'YYYY-MM'));
  select count(*) into n from public.beautyos_recorrentes where empresa_id = dono;
  execute 'reset role';
  res := res || format('%s fixo novo nasce na empresa do dono (%s)', case when n = 2 then 'ok' else 'FALHOU' end, n);

  -- 6b. Agenda avisa a receita de um atendimento concluído (aviso financeiro).
  perform set_config('request.jwt.claims', json_build_object('sub', ag, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    insert into public.beautyos_notifications (empresa_id, title, message, type)
    values (public.beautyos_empresa_atual(), 'Atendimento concluído', '+R$ 80', 'financial');
    msg := 'avisou';
  exception when others then msg := sqlerrm;
  end;
  execute 'reset role';
  res := res || format('%s agenda cria aviso financeiro ao concluir (%s)', case when msg = 'avisou' then 'ok' else 'FALHOU' end, msg);

  -- 7. Estranho e visitante não veem nada da empresa.
  select c.id into v from public.beautyos_clients c where c.empresa_id = dono limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', est, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    insert into public.beautyos_appointments (empresa_id, client_id, client_name, service, date, time, price, duration, status)
    values (est, v, 'Roubada', 'Corte', current_date, '15:00', 1, 30, 'Confirmado');
    msg := 'gravou';
  exception when others then msg := sqlerrm;
  end;
  res := res || format('%s cliente de outra empresa recusado no agendamento (%s)', case when msg = 'cliente_de_outra_empresa' then 'ok' else 'FALHOU' end, msg);
  select (select count(*) from public.beautyos_clients where empresa_id = dono)
       + (select count(*) from public.beautyos_transactions where empresa_id = dono)
       + (select count(*) from public.beautyos_appointments where empresa_id = dono)
       + (select count(*) from public.beautyos_settings where empresa_id = dono)
       + (select count(*) from public.beautyos_membros where empresa_id = dono) into n;
  execute 'reset role';
  res := res || format('%s estranho não vê nada da empresa (%s)', case when n = 0 then 'ok' else 'FALHOU' end, n);

  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
  begin
    select count(*) into n from public.beautyos_clients;
    msg := n::text;
  exception when others then msg := 'sem permissão';
  end;
  begin
    perform public.beautyos_criar_convite(array['agenda'], null);
    msg := msg || ', criou convite';
  exception when others then msg := msg || ', sem convite';
  end;
  execute 'reset role';
  res := res || format('%s visitante sem acesso (%s)', case when msg in ('0, sem convite', 'sem permissão, sem convite') then 'ok' else 'FALHOU' end, msg);

  -- 8. Dono muda áreas e remove; quem sai ganha empresa própria vazia.
  select agenda_token into tok from public.beautyos_settings where empresa_id = dono;
  perform set_config('request.jwt.claims', json_build_object('sub', dono, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.beautyos_atualizar_membro(ag, array['agenda', 'clientes'], null);
  perform public.beautyos_remover_membro(fin);
  begin
    perform public.beautyos_remover_membro(dono);
    msg := 'removeu o dono';
  exception when others then msg := sqlerrm;
  end;
  execute 'reset role';
  res := res || format('%s dono não remove a si mesmo (%s)', case when msg = 'membro_nao_encontrado' then 'ok' else 'FALHOU' end, msg);
  select count(*) into n from public.beautyos_settings where empresa_id = dono and agenda_token is distinct from tok;
  res := res || format('%s remover troca o link da agenda (%s)', case when n = 1 then 'ok' else 'FALHOU' end, n);
  select agenda_token into tok from public.beautyos_settings where empresa_id = dono;
  select count(*) into n from public.beautyos_membros where user_id = ag and areas = array['agenda', 'clientes'];
  res := res || format('%s áreas atualizadas (%s)', case when n = 1 then 'ok' else 'FALHOU' end, n);

  perform set_config('request.jwt.claims', json_build_object('sub', fin, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.beautyos_transactions;
  v := public.beautyos_garantir_empresa();
  execute 'reset role';
  res := res || format('%s removido perde acesso (%s) e ganha empresa própria', case when n = 0 and v = fin then 'ok' else 'FALHOU' end, n);

  perform set_config('request.jwt.claims', json_build_object('sub', ag, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  v := public.beautyos_sair_da_equipe();
  execute 'reset role';
  select count(*) into n from public.beautyos_membros where user_id = ag and empresa_id = ag and papel = 'dono';
  res := res || format('%s quem sai volta a ser dono de empresa própria (%s)', case when v = ag and n = 1 then 'ok' else 'FALHOU' end, n);
  select count(*) into n from public.beautyos_settings where empresa_id = dono and agenda_token is distinct from tok;
  res := res || format('%s sair também troca o link da agenda (%s)', case when n = 1 then 'ok' else 'FALHOU' end, n);

  -- 9. Contas reais: cada dono continua vendo exatamente as próprias linhas.
  for emp in select e.id from public.beautyos_empresas e
             where e.id not in (dono, ag, fin, est, cheio, gg) loop
    select (select count(*) from public.beautyos_clients where empresa_id = emp.id)
         + (select count(*) from public.beautyos_appointments where empresa_id = emp.id)
         + (select count(*) from public.beautyos_transactions where empresa_id = emp.id)
         + (select count(*) from public.beautyos_services where empresa_id = emp.id)
         + (select count(*) from public.beautyos_notifications where empresa_id = emp.id)
         + (select count(*) from public.beautyos_recorrentes where empresa_id = emp.id)
         + (select count(*) from public.beautyos_importacoes where empresa_id = emp.id)
         + (select count(*) from public.beautyos_settings where empresa_id = emp.id)
         + (select count(*) from public.beautyos_automation_templates where empresa_id = emp.id)
      into esperado;
    perform set_config('request.jwt.claims', json_build_object('sub', emp.id, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select (select count(*) from public.beautyos_clients)
         + (select count(*) from public.beautyos_appointments)
         + (select count(*) from public.beautyos_transactions)
         + (select count(*) from public.beautyos_services)
         + (select count(*) from public.beautyos_notifications)
         + (select count(*) from public.beautyos_recorrentes)
         + (select count(*) from public.beautyos_importacoes)
         + (select count(*) from public.beautyos_settings)
         + (select count(*) from public.beautyos_automation_templates)
      into n;
    execute 'reset role';
    if n <> esperado then
      res := res || format('FALHOU conta real %s vê %s linhas, esperado %s', emp.id, n, esperado);
    end if;
  end loop;
  select count(*) into n from public.beautyos_empresas e where e.id not in (dono, ag, fin, est, cheio, gg);
  res := res || format('ok contas reais conferidas: %s', n);

  select count(*) into falhas from unnest(res) r where r like 'FALHOU%';
  raise exception E'RESULTADO (falhas: %)\n%', falhas, array_to_string(res, E'\n');
end $$;

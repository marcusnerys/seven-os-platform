-- Rate limiting na tabela de agendamentos públicos
-- Execute no Supabase Dashboard → SQL Editor

-- 1. Função que valida o limite antes de inserir
CREATE OR REPLACE FUNCTION beautyos_create_appointment_ratelimited(
  p_empresa_id   uuid,
  p_client_name  text,
  p_client_phone text,
  p_service      text,
  p_date         date,
  p_time         text,
  p_price        numeric,
  p_duration     int,
  p_notes        text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_by_phone  int;
  v_by_studio int;
BEGIN
  -- Máx. 3 agendamentos do mesmo telefone por hora (ignora se telefone vazio)
  IF p_client_phone IS NOT NULL AND p_client_phone <> '' THEN
    SELECT COUNT(*) INTO v_by_phone
    FROM beautyos_appointments
    WHERE client_phone = p_client_phone
      AND created_at > NOW() - INTERVAL '1 hour';

    IF v_by_phone >= 3 THEN
      RETURN json_build_object('error', 'rate_limit_phone');
    END IF;
  END IF;

  -- Máx. 20 agendamentos por estúdio por hora (proteção geral)
  SELECT COUNT(*) INTO v_by_studio
  FROM beautyos_appointments
  WHERE empresa_id = p_empresa_id
    AND created_at > NOW() - INTERVAL '1 hour';

  IF v_by_studio >= 20 THEN
    RETURN json_build_object('error', 'rate_limit_studio');
  END IF;

  -- Insere o agendamento
  INSERT INTO beautyos_appointments (
    empresa_id, client_id, client_name, client_phone,
    service, date, time, price, duration, status, notes
  ) VALUES (
    p_empresa_id, NULL, p_client_name, p_client_phone,
    p_service, p_date, p_time, p_price, p_duration, 'Pendente', p_notes
  );

  RETURN json_build_object('ok', true);
END;
$$;

-- 2. Permissão: anon pode chamar a função (mas não inserir diretamente na tabela)
GRANT EXECUTE ON FUNCTION beautyos_create_appointment_ratelimited TO anon;

-- 3. Opcional: revogar INSERT direto de anon na tabela (se RLS não cobrir)
-- REVOKE INSERT ON beautyos_appointments FROM anon;
-- (só remova o comentário se tiver certeza que o app usa apenas a função acima)

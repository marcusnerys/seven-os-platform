-- A reserva pública não checava conflito de horário. Dois visitantes que
-- abrissem o link ao mesmo tempo reservavam o mesmo slot, e o estúdio só
-- descobria quando as duas clientes aparecessem juntas.
--
-- Verificado antes da correção: duas chamadas seguidas à RPC para 14:00 do
-- mesmo dia retornaram ambas {"ok": true}.
--
-- A checagem vai dentro da função porque ela é o único caminho de escrita da
-- página pública (migration 0009 fechou o INSERT direto). O LOCK serializa
-- reservas concorrentes do mesmo estúdio, de modo que duas requisições
-- simultâneas não passem as duas pela verificação antes de qualquer inserção.

CREATE OR REPLACE FUNCTION public.beautyos_create_appointment_ratelimited(
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
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_by_phone  int;
  v_by_studio int;
  v_inicio    int;
  v_fim       int;
  v_conflito  int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM beautyos_empresas WHERE id = p_empresa_id) THEN
    RETURN json_build_object('error', 'estudio_inexistente');
  END IF;

  IF p_duration IS NULL OR p_duration <= 0 THEN
    RETURN json_build_object('error', 'duracao_invalida');
  END IF;

  -- Não aceita reserva no passado. O cliente não valida isso, então sem esta
  -- checagem dá para reservar um horário que já passou no próprio dia.
  IF (p_date + p_time::time) < (NOW() AT TIME ZONE 'America/Sao_Paulo') THEN
    RETURN json_build_object('error', 'horario_no_passado');
  END IF;

  IF p_client_phone IS NOT NULL AND p_client_phone <> '' THEN
    SELECT COUNT(*) INTO v_by_phone
    FROM beautyos_appointments
    WHERE client_phone = p_client_phone
      AND empresa_id = p_empresa_id
      AND criado_em > NOW() - INTERVAL '1 hour';

    IF v_by_phone >= 3 THEN
      RETURN json_build_object('error', 'rate_limit_phone');
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_by_studio
  FROM beautyos_appointments
  WHERE empresa_id = p_empresa_id
    AND criado_em > NOW() - INTERVAL '1 hour';

  IF v_by_studio >= 20 THEN
    RETURN json_build_object('error', 'rate_limit_studio');
  END IF;

  -- Serializa as reservas deste estúdio até o fim da transação.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_empresa_id::text, 0));

  v_inicio := EXTRACT(HOUR FROM p_time::time) * 60 + EXTRACT(MINUTE FROM p_time::time);
  v_fim    := v_inicio + p_duration;

  SELECT COUNT(*) INTO v_conflito
  FROM beautyos_appointments
  WHERE empresa_id = p_empresa_id
    AND date = p_date
    AND status <> 'Cancelado'
    AND v_inicio < (EXTRACT(HOUR FROM time::time) * 60 + EXTRACT(MINUTE FROM time::time) + COALESCE(duration, 60))
    AND v_fim    > (EXTRACT(HOUR FROM time::time) * 60 + EXTRACT(MINUTE FROM time::time));

  IF v_conflito > 0 THEN
    RETURN json_build_object('error', 'horario_ocupado');
  END IF;

  INSERT INTO beautyos_appointments (
    empresa_id, client_id, client_name, client_phone,
    service, date, time, price, duration, status, notes
  ) VALUES (
    p_empresa_id, NULL, p_client_name, p_client_phone,
    p_service, p_date, p_time, p_price, p_duration, 'Pendente', p_notes
  );

  INSERT INTO beautyos_notifications (empresa_id, title, message, type, read)
  VALUES (
    p_empresa_id,
    'Nova reserva recebida',
    p_service || ' • ' || p_time || E'\n' || 'Cliente: ' || p_client_name,
    'booking',
    false
  );

  RETURN json_build_object('ok', true);
END;
$function$;

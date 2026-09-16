-- A função de reserva pública consultava uma coluna "created_at" que nunca
-- existiu: em beautyos_appointments a coluna de data de criação chama-se
-- "criado_em". O resultado é que TODA reserva pela página /book/<id> falhava
-- com 42703 antes mesmo de chegar ao INSERT.
--
-- Aqui só troca o nome da coluna nas duas checagens de limite. A lógica de
-- rate limit e o INSERT permanecem idênticos.

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
BEGIN
  -- Máx. 3 agendamentos do mesmo telefone por hora
  IF p_client_phone IS NOT NULL AND p_client_phone <> '' THEN
    SELECT COUNT(*) INTO v_by_phone
    FROM beautyos_appointments
    WHERE client_phone = p_client_phone
      AND criado_em > NOW() - INTERVAL '1 hour';

    IF v_by_phone >= 3 THEN
      RETURN json_build_object('error', 'rate_limit_phone');
    END IF;
  END IF;

  -- Máx. 20 agendamentos por estúdio por hora
  SELECT COUNT(*) INTO v_by_studio
  FROM beautyos_appointments
  WHERE empresa_id = p_empresa_id
    AND criado_em > NOW() - INTERVAL '1 hour';

  IF v_by_studio >= 20 THEN
    RETURN json_build_object('error', 'rate_limit_studio');
  END IF;

  INSERT INTO beautyos_appointments (
    empresa_id, client_id, client_name, client_phone,
    service, date, time, price, duration, status, notes
  ) VALUES (
    p_empresa_id, NULL, p_client_name, p_client_phone,
    p_service, p_date, p_time, p_price, p_duration, 'Pendente', p_notes
  );

  RETURN json_build_object('ok', true);
END;
$function$;

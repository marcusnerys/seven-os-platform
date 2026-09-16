-- FALHA DE SEGURANÇA: as políticas appointments_public_insert e
-- notifications_public_insert permitiam INSERT anônimo direto nas tabelas.
-- O WITH CHECK verificava apenas (client_id IS NULL AND status = 'Pendente')
-- e (type = 'booking' AND read = false) — nada restringia empresa_id, price,
-- date ou quantidade.
--
-- Como a chave publicável vai no bundle do site, qualquer pessoa com o link
-- /book/<id> podia injetar agendamentos ilimitados na agenda de qualquer
-- estúdio, com preço arbitrário, sem passar pela RPC que tem rate limit.
-- Verificado empiricamente: 3 POSTs seguidos ao PostgREST retornaram 201.
--
-- Correção: a reserva pública passa a existir SÓ através da RPC
-- beautyos_create_appointment_ratelimited, que é SECURITY DEFINER (ignora RLS
-- por si) e aplica os limites. A notificação ao dono, que o front criava num
-- INSERT separado, passa a ser criada dentro da própria RPC — assim o cliente
-- anônimo não precisa mais de permissão de escrita em tabela nenhuma.

BEGIN;

-- 1) A RPC passa a criar também a notificação, dentro da mesma transação.
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
  -- O estúdio precisa existir. Sem isto, um empresa_id inventado gera erro de
  -- chave estrangeira cru no meio do fluxo do visitante.
  IF NOT EXISTS (SELECT 1 FROM beautyos_empresas WHERE id = p_empresa_id) THEN
    RETURN json_build_object('error', 'estudio_inexistente');
  END IF;

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

-- 2) Fecha a escrita anônima direta. A RPC acima é o único caminho.
DROP POLICY IF EXISTS appointments_public_insert  ON beautyos_appointments;
DROP POLICY IF EXISTS notifications_public_insert ON beautyos_notifications;

-- 3) O papel anônimo não precisa escrever em nenhuma tabela do app: o que ele
-- pode fazer passa pelas funções SECURITY DEFINER. Os GRANTs amplos que vieram
-- do schema padrão transformam qualquer política permissiva futura em brecha.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES
  ON ALL TABLES IN SCHEMA public FROM anon;

COMMIT;

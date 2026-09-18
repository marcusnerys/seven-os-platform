-- A automação de WhatsApp nunca funcionou para ninguém.
--
-- Nenhum caminho do código cria um template: o trigger de cadastro criava só
-- empresa e settings, o store tem updateAutomationTemplate mas não add, e a
-- tela de Automação apenas edita e liga/desliga o que já existe. Com a tabela
-- vazia, todo gatilho cai no `if (!template) return` e não acontece nada —
-- sem erro, sem aviso. Verificado: os 4 usuários reais têm 0 templates.
--
-- Esta migration semeia os modelos padrão no cadastro e preenche quem já
-- existe. Os textos usam {{empresa}} em vez de um nome fixo, para servirem a
-- salão, oficina ou qualquer outro negócio.

-- Semeia os modelos de um usuário. Idempotente: só insere o que falta.
CREATE OR REPLACE FUNCTION public.beautyos_seed_automation_templates(p_empresa_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO beautyos_automation_templates (empresa_id, type, title, message, is_active)
  SELECT p_empresa_id, v.type, v.title, v.message, v.is_active
  FROM (VALUES
    ('welcome', 'Boas-vindas',
     '{{saudacao}}, {{nome}}! Seja bem-vindo(a) à {{empresa}}. Estamos à disposição para o que precisar.',
     true),
    ('confirmation', 'Confirmação de agendamento',
     '{{saudacao}}, {{nome}}! Seu horário na {{empresa}} está confirmado: {{servico}} em {{data}} às {{hora}}. Até lá!',
     true),
    ('reminder', 'Lembrete de véspera',
     '{{saudacao}}, {{nome}}! Passando para lembrar do seu horário amanhã: {{servico}} às {{hora}}, na {{empresa}}. Podemos confirmar?',
     true),
    ('post_attendance', 'Pós-atendimento',
     '{{saudacao}}, {{nome}}! Obrigado por escolher a {{empresa}}. Como foi sua experiência com {{servico}}? Seu retorno ajuda muito.',
     true),
    ('birthday', 'Aniversário',
     '{{saudacao}}, {{nome}}! Hoje é seu dia, e a {{empresa}} passa para desejar tudo de bom. Feliz aniversário!',
     true),
    ('custom', 'Mensagem avulsa',
     '{{saudacao}}, {{nome}}! Aqui é da {{empresa}}. ',
     true)
  ) AS v(type, title, message, is_active)
  WHERE NOT EXISTS (
    SELECT 1 FROM beautyos_automation_templates t
    WHERE t.empresa_id = p_empresa_id AND t.type = v.type
  );
END;
$function$;

-- O trigger de cadastro passa a semear junto com empresa e settings.
CREATE OR REPLACE FUNCTION public.handle_new_beautyos_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.beautyos_empresas (id)
  VALUES (new.id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.beautyos_settings (empresa_id)
  VALUES (new.id)
  ON CONFLICT (empresa_id) DO NOTHING;

  PERFORM public.beautyos_seed_automation_templates(new.id);

  RETURN new;
END;
$function$;

-- Preenche quem já está cadastrado e nunca teve template nenhum.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM auth.users LOOP
    PERFORM public.beautyos_seed_automation_templates(r.id);
  END LOOP;
END $$;

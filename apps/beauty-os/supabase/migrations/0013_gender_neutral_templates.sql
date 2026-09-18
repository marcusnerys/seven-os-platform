-- Os seis modelos semeados na 0011 colocavam um artigo feminino antes de
-- {{empresa}}: "bem-vindo(a) à {{empresa}}", "na {{empresa}}", "a {{empresa}}".
-- Como o nome do negócio é texto livre, isso produz concordância errada na
-- maioria dos casos — "bem-vindo(a) à Meu Negócio", "na Auto Center Silva".
--
-- A saída é não usar artigo antes do nome: assinar a mensagem no fim, como se
-- faz em WhatsApp de verdade. Funciona para qualquer nome, de qualquer gênero.
--
-- Só atualiza quem ainda está com o texto original da 0011. Quem já editou a
-- mensagem na tela de Automação fica intocado.

UPDATE beautyos_automation_templates SET message =
  '{{saudacao}}, {{nome}}! Seja bem-vindo(a). Aqui é {{empresa}} — estamos à disposição para o que precisar.'
WHERE type = 'welcome' AND message =
  '{{saudacao}}, {{nome}}! Seja bem-vindo(a) à {{empresa}}. Estamos à disposição para o que precisar.';

UPDATE beautyos_automation_templates SET message =
  '{{saudacao}}, {{nome}}! Seu horário está confirmado: {{servico}} em {{data}} às {{hora}}. Até lá! — {{empresa}}'
WHERE type = 'confirmation' AND message =
  '{{saudacao}}, {{nome}}! Seu horário na {{empresa}} está confirmado: {{servico}} em {{data}} às {{hora}}. Até lá!';

UPDATE beautyos_automation_templates SET message =
  '{{saudacao}}, {{nome}}! Passando para lembrar do seu horário amanhã: {{servico}} às {{hora}}. Podemos confirmar? — {{empresa}}'
WHERE type = 'reminder' AND message =
  '{{saudacao}}, {{nome}}! Passando para lembrar do seu horário amanhã: {{servico}} às {{hora}}, na {{empresa}}. Podemos confirmar?';

UPDATE beautyos_automation_templates SET message =
  '{{saudacao}}, {{nome}}! Obrigado pela preferência. Como foi sua experiência com {{servico}}? Seu retorno ajuda muito. — {{empresa}}'
WHERE type = 'post_attendance' AND message =
  '{{saudacao}}, {{nome}}! Obrigado por escolher a {{empresa}}. Como foi sua experiência com {{servico}}? Seu retorno ajuda muito.';

UPDATE beautyos_automation_templates SET message =
  '{{saudacao}}, {{nome}}! Hoje é seu dia, e passamos para desejar tudo de bom. Feliz aniversário! — {{empresa}}'
WHERE type = 'birthday' AND message =
  '{{saudacao}}, {{nome}}! Hoje é seu dia, e a {{empresa}} passa para desejar tudo de bom. Feliz aniversário!';

UPDATE beautyos_automation_templates SET message =
  '{{saudacao}}, {{nome}}! Aqui é {{empresa}}. '
WHERE type = 'custom' AND message =
  '{{saudacao}}, {{nome}}! Aqui é da {{empresa}}. ';

-- A função de semeadura passa a criar já com os textos corrigidos, para que
-- cadastros novos não reintroduzam o problema.
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
     '{{saudacao}}, {{nome}}! Seja bem-vindo(a). Aqui é {{empresa}} — estamos à disposição para o que precisar.',
     true),
    ('confirmation', 'Confirmação de agendamento',
     '{{saudacao}}, {{nome}}! Seu horário está confirmado: {{servico}} em {{data}} às {{hora}}. Até lá! — {{empresa}}',
     true),
    ('reminder', 'Lembrete de véspera',
     '{{saudacao}}, {{nome}}! Passando para lembrar do seu horário amanhã: {{servico}} às {{hora}}. Podemos confirmar? — {{empresa}}',
     true),
    ('post_attendance', 'Pós-atendimento',
     '{{saudacao}}, {{nome}}! Obrigado pela preferência. Como foi sua experiência com {{servico}}? Seu retorno ajuda muito. — {{empresa}}',
     true),
    ('birthday', 'Aniversário',
     '{{saudacao}}, {{nome}}! Hoje é seu dia, e passamos para desejar tudo de bom. Feliz aniversário! — {{empresa}}',
     true),
    ('custom', 'Mensagem avulsa',
     '{{saudacao}}, {{nome}}! Aqui é {{empresa}}. ',
     true)
  ) AS v(type, title, message, is_active)
  WHERE NOT EXISTS (
    SELECT 1 FROM beautyos_automation_templates t
    WHERE t.empresa_id = p_empresa_id AND t.type = v.type
  );
END;
$function$;

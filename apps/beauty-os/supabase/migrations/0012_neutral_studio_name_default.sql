-- O padrão da coluna studio_name era 'Leshanot Studio', então todo negócio
-- recém-cadastrado nascia com o nome de um salão de beleza — inclusive uma
-- oficina mecânica ou um controle de finanças pessoais. O onboarding pede o
-- nome logo em seguida e sobrescreve, mas até lá o valor aparece no Dashboard,
-- no rodapé e na prévia das mensagens de WhatsApp.
--
-- 'Meu Negócio' é o mesmo texto que o app já usa como padrão no cliente.

ALTER TABLE beautyos_settings
  ALTER COLUMN studio_name SET DEFAULT 'Meu Negócio';

-- Corrige quem já foi criado com o padrão antigo e nunca trocou o nome.
-- Quem escolheu um nome próprio (mesmo que seja "Leshanot Studio") não é
-- afetado: só muda quem está exatamente no valor padrão antigo E não tem
-- nenhum dado ainda, o que caracteriza conta que nunca passou pelo onboarding.
UPDATE beautyos_settings s
SET studio_name = 'Meu Negócio'
WHERE s.studio_name = 'Leshanot Studio'
  AND NOT EXISTS (SELECT 1 FROM beautyos_clients      c WHERE c.empresa_id = s.empresa_id)
  AND NOT EXISTS (SELECT 1 FROM beautyos_appointments a WHERE a.empresa_id = s.empresa_id)
  AND NOT EXISTS (SELECT 1 FROM beautyos_services     v WHERE v.empresa_id = s.empresa_id);

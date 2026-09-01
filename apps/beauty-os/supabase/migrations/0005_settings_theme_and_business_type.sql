-- beautyos_settings ganhou três colunas que o app já grava mas que nunca
-- existiram no schema, então todo upsert de configurações falhava com
-- "column does not exist" — era a causa do "Erro ao salvar" no modal de
-- Configurações do Estúdio.
--
-- theme_accent / theme_bg: o tema escolhido pelo usuário precisa ficar no
-- banco (não só no localStorage) porque a página pública de agendamento
-- lê essas cores para se pintar igual ao app do profissional.
--
-- business_type: vertical do negócio (beauty | auto | personal | generic).
-- Define a terminologia visível e quais abas aparecem — ver src/lib/vertical.ts.
-- Default 'generic' para não quebrar linhas já existentes.

alter table public.beautyos_settings
  add column if not exists theme_accent  text,
  add column if not exists theme_bg      text,
  add column if not exists business_type text default 'generic';

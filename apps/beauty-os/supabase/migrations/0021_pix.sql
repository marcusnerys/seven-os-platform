-- Cobrança PIX "copia e cola" (v3.1): chave, nome e cidade do recebedor,
-- que entram no BR Code gerado no aparelho. Sem gateway e sem custo.
alter table public.beautyos_settings
  add column if not exists pix_chave  text,
  add column if not exists pix_nome   text,
  add column if not exists pix_cidade text;

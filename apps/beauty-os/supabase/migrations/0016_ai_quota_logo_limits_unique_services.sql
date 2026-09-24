-- Achados da revisão das correções de 2026-09-23.

-- ───────────────────────────────────────────────────────────────────────
-- 1. Bucket de logo sem limite.
--
-- O cadastro é aberto. Qualquer conta nova podia, com o próprio token, subir
-- arquivos de qualquer tipo e até 50 MB para a pasta dela, servidos
-- publicamente pelo domínio do projeto. Umas vinte chamadas esgotariam o
-- 1 GB gratuito do Storage. O app só envia JPEG reduzido a 512 px.
-- ───────────────────────────────────────────────────────────────────────
update storage.buckets
set file_size_limit    = 1048576,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'beautyos-logos';

-- ───────────────────────────────────────────────────────────────────────
-- 2. Cota de IA por usuário.
--
-- Exigir login protegia a cota compartilhada do Gemini só contra quem não
-- tem conta — e criar conta é livre. Uma conta descartável em loop esgotava
-- a cota de todos os negócios igual. Cada chamada ao assistente de voz ou à
-- leitura de extrato passa a registrar uso por hora, com teto.
-- ───────────────────────────────────────────────────────────────────────
create table if not exists public.beautyos_ia_uso (
  empresa_id uuid        not null references auth.users(id) on delete cascade,
  janela     timestamptz not null,
  chamadas   integer     not null default 0,
  primary key (empresa_id, janela)
);

alter table public.beautyos_ia_uso enable row level security;
-- Sem policies: só a função abaixo (security definer) mexe na tabela.

create or replace function public.beautyos_registrar_uso_ia()
returns boolean
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_usuario  uuid := auth.uid();
  v_janela   timestamptz := date_trunc('hour', now());
  v_chamadas integer;
begin
  if v_usuario is null then
    return false;
  end if;

  insert into beautyos_ia_uso (empresa_id, janela, chamadas)
  values (v_usuario, v_janela, 1)
  on conflict (empresa_id, janela)
  do update set chamadas = beautyos_ia_uso.chamadas + 1
  returning chamadas into v_chamadas;

  -- Limpa janelas antigas da própria pessoa, para a tabela não crescer.
  delete from beautyos_ia_uso
  where empresa_id = v_usuario and janela < v_janela - interval '1 day';

  -- 60 por hora cobre com folga o uso real: um comando de voz a cada
  -- minuto, ou dezenas de extratos. Um loop automatizado para aqui.
  return v_chamadas <= 60;
end;
$function$;

revoke all on function public.beautyos_registrar_uso_ia() from public, anon;
grant execute on function public.beautyos_registrar_uso_ia() to authenticated;

-- ───────────────────────────────────────────────────────────────────────
-- 3. Nome de serviço único por negócio.
--
-- A reserva pública resolve o serviço pelo nome, no catálogo. Com dois
-- "Corte" de preços e durações diferentes, a RPC podia gravar o outro:
-- bloquear 30 min de um atendimento de 60 e lançar a receita errada.
-- Verificado antes: não há nomes repetidos em produção.
-- ───────────────────────────────────────────────────────────────────────
create unique index if not exists beautyos_services_nome_unico
  on public.beautyos_services (empresa_id, lower(trim(name)));

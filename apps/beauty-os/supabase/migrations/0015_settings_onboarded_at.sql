-- Marca explícita de onboarding concluído.
--
-- O onboarding ficava só no localStorage do aparelho. Num celular novo, ou
-- depois de sair e entrar, ele reaparecia para contas já configuradas,
-- começando em "Outro negócio" — e quem só avançasse sobrescrevia nome e tipo
-- de negócio salvos.
--
-- A primeira correção tratou "existe linha em beautyos_settings" como
-- "já configurou". Não serve: o gatilho de cadastro
-- (handle_new_beautyos_user) cria a linha no mesmo instante da conta, então
-- toda conta nova pularia o onboarding. Por isso a coluna própria, gravada
-- quando o onboarding termina.

alter table public.beautyos_settings add column if not exists onboarded_at timestamptz;

-- Contas que já passaram pelo onboarding antes desta coluna existir: nome
-- diferente do padrão do gatilho, ou negócio que já tem dados.
update public.beautyos_settings s
set onboarded_at = now()
where s.onboarded_at is null
  and (
    coalesce(trim(s.studio_name), '') not in ('', 'Meu Negócio', 'Meu Negocio')
    or exists (select 1 from public.beautyos_clients      c where c.empresa_id = s.empresa_id)
    or exists (select 1 from public.beautyos_appointments a where a.empresa_id = s.empresa_id)
    or exists (select 1 from public.beautyos_services     v where v.empresa_id = s.empresa_id)
  );

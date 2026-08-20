-- Corrige achado de segurança: as policies anteriores expunham TODOS os
-- tenants via `using (true)`. Substituímos por funções RPC que só
-- retornam dados do empresa_id explicitamente pedido, sem permitir
-- enumeração em massa de outros negócios do piloto.

drop policy "services_public_read" on beautyos_services;
drop policy "settings_public_read" on beautyos_settings;

create function public.beautyos_public_services(p_empresa_id uuid)
returns setof beautyos_services
language sql
security definer
set search_path = public
stable
as $$
  select * from beautyos_services where empresa_id = p_empresa_id;
$$;
grant execute on function public.beautyos_public_services(uuid) to anon;

create function public.beautyos_public_settings(p_empresa_id uuid)
returns table(studio_name text, location text, currency text)
language sql
security definer
set search_path = public
stable
as $$
  select studio_name, location, currency from beautyos_settings where empresa_id = p_empresa_id;
$$;
grant execute on function public.beautyos_public_settings(uuid) to anon;

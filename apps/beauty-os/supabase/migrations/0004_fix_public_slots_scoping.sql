-- Corrige achado do code-review: beautyos_public_slots (view criada em
-- 0002) não era filtrada por RLS para o role anon — a view roda com o
-- privilégio do owner (bypassa RLS de beautyos_appointments), então
-- `select * from beautyos_public_slots` sem filtro retornava a agenda de
-- TODOS os tenants. Substituímos por uma função RPC escopada a um
-- empresa_id específico.

drop view beautyos_public_slots;

create function public.beautyos_public_slots(p_empresa_id uuid, p_date date)
returns table("time" text, duration integer)
language sql
security definer
set search_path = public
stable
as $$
  select "time", duration
  from beautyos_appointments
  where empresa_id = p_empresa_id
    and date = p_date
    and status <> 'Cancelado';
$$;
grant execute on function public.beautyos_public_slots(uuid, date) to anon;

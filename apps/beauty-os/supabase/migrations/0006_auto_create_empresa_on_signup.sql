-- Todo dado do app pendura em beautyos_empresas por foreign key, mas nada
-- criava essa linha: quem se cadastrava ficava com usuário em auth.users e
-- nenhuma empresa. O primeiro upsert em beautyos_settings então violava a FK,
-- o erro subia como exceção e o onboarding travava no último passo — o botão
-- "Começar a usar" não avançava e o usuário não entrava no app.
--
-- Dois dos três usuários existentes estavam nesse estado.

create or replace function public.beautyos_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.beautyos_empresas (id, nome)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Meu Negócio')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists beautyos_on_auth_user_created on auth.users;

create trigger beautyos_on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.beautyos_handle_new_user();

-- Backfill de quem já se cadastrou antes de o trigger existir.
insert into public.beautyos_empresas (id, nome)
select u.id, coalesce(u.raw_user_meta_data->>'full_name', 'Meu Negócio')
from auth.users u
where not exists (select 1 from public.beautyos_empresas e where e.id = u.id)
on conflict (id) do nothing;

-- Reverte a metade errada da migration 0006.
--
-- Já existia um trigger de cadastro, on_auth_user_created_beautyos, chamando
-- handle_new_beautyos_user(). A 0006 acrescentou um segundo trigger fazendo a
-- mesma inserção em beautyos_empresas. Triggers disparam em ordem alfabética,
-- então beautyos_on_auth_user_created rodava primeiro e inseria a empresa; em
-- seguida o trigger antigo tentava inserir o mesmo id, batia na primary key e
-- abortava a transação inteira. Nenhum cadastro novo conseguia concluir —
-- "Database error saving new user", que o app exibia como "Erro ao criar conta".
--
-- O diagnóstico da 0006 estava certo (havia usuários sem empresa) mas a correção
-- foi redundante: o trigger original já cobre o caso, e cobre melhor, porque
-- também cria a linha em beautyos_settings. O backfill da 0006 continua válido.

drop trigger if exists beautyos_on_auth_user_created on auth.users;
drop function if exists public.beautyos_handle_new_user();

-- Torna o trigger remanescente idempotente. Sem isto, qualquer linha
-- pré-existente para o mesmo id derruba o cadastro inteiro — a mesma falha
-- acima, apenas disparada por outro caminho.
create or replace function public.handle_new_beautyos_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.beautyos_empresas (id)
  values (new.id)
  on conflict (id) do nothing;

  insert into public.beautyos_settings (empresa_id)
  values (new.id)
  on conflict (empresa_id) do nothing;

  return new;
end;
$function$;

-- Membros da familia: convite por e-mail + aceite automatico, listagem e remocao.

-- Helper: usuario atual e owner do household? (security definer evita recursao de RLS)
create or replace function public.is_household_owner(target_household_id text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = auth.uid()
      and hm.role = 'owner'
  );
$$;

-- Helper: o usuario alvo compartilha algum household com o usuario atual?
create or replace function public.shares_household_with(target_user uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.household_members a
    join public.household_members b on a.household_id = b.household_id
    where a.user_id = auth.uid()
      and b.user_id = target_user
  );
$$;

-- Permite que membros da mesma familia vejam o nome um do outro (para a lista de membros).
drop policy if exists "profiles read same household" on public.profiles;
create policy "profiles read same household" on public.profiles
  for select
  using (user_id = auth.uid() or public.shares_household_with(user_id));

-- Permite remover membros (owner remove qualquer um; qualquer membro pode sair sozinho).
drop policy if exists "members delete owner or self" on public.household_members;
create policy "members delete owner or self" on public.household_members
  for delete
  using (public.is_household_owner(household_id) or user_id = auth.uid());

-- Aceita convites pendentes do e-mail do usuario logado e cria o vinculo de membro.
-- SECURITY DEFINER porque o convidado ainda nao pode LER household_invites pela RLS.
create or replace function public.accept_household_invites()
returns setof text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  r record;
begin
  if v_uid is null then
    return;
  end if;

  select email into v_email from auth.users where id = v_uid;
  if v_email is null then
    return;
  end if;

  for r in
    select * from public.household_invites
    where lower(email) = lower(v_email)
      and accepted_at is null
      and expires_at > now()
  loop
    insert into public.household_members (household_id, user_id, role)
    values (r.household_id, v_uid, r.role)
    on conflict (household_id, user_id) do nothing;

    update public.household_invites
      set accepted_by = v_uid, accepted_at = now()
      where id = r.id;

    return next r.household_id;
  end loop;

  return;
end;
$$;

grant execute on function public.accept_household_invites() to authenticated;
grant execute on function public.is_household_owner(text) to authenticated;
grant execute on function public.shares_household_with(uuid) to authenticated;

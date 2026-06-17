-- Corrige o impasse circular ao sincronizar households.
-- A política antiga de UPDATE exigia que o usuário já fosse 'owner' em household_members,
-- mas no primeiro sync esse vínculo ainda não existe no servidor (FK exige a household antes,
-- e o upsert da household em conflito dispara a checagem USING do UPDATE).
-- Passamos a permitir também o criador da household (created_by = auth.uid()).

drop policy if exists "households update owner" on public.households;

create policy "households update owner or creator" on public.households
  for update
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.household_members hm
      where hm.household_id = id and hm.user_id = auth.uid() and hm.role = 'owner'
    )
  )
  with check (
    created_by = auth.uid()
    or exists (
      select 1 from public.household_members hm
      where hm.household_id = id and hm.user_id = auth.uid() and hm.role = 'owner'
    )
  );

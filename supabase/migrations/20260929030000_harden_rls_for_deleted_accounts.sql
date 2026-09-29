-- Durcissement RLS : cf. docs/superpowers/specs/2026-09-29-account-deletion-design.md.
-- Un compte marqué deleted_at ne doit plus jamais réussir une écriture, même
-- avec un token encore valide après la déconnexion forcée côté client
-- (jusqu'à ~1h). Cohérent avec le principe déjà affirmé dans SECURITE.md /
-- ARCHITECTURE.md : toute autorisation réelle vit dans Postgres (RLS), pas
-- côté client. Les policies de LECTURE ne sont volontairement pas touchées
-- — seule l'écriture est bloquée, le contenu reste visible.

create or replace function public.is_active_account()
returns boolean
language sql
stable
as $$
  select not exists (
    select 1 from public.users where id = auth.uid() and deleted_at is not null
  );
$$;

-- issues : policies non trackées dans l'historique des migrations (cf.
-- MANUEL_MISE_A_JOUR.md §5 — le dossier migrations/ n'est pas l'historique
-- fiable, elles précèdent le suivi versionné). On les remplace intégralement
-- plutôt que de deviner leurs noms, avec la logique déjà documentée dans
-- SECURITE.md/ARCHITECTURE.md : lecture ouverte, écriture et suppression
-- réservées au propriétaire (auth.uid() = created_by).
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'issues'
  loop
    execute format('drop policy %I on public.issues', pol.policyname);
  end loop;
end $$;

create policy "Authenticated users can read issues"
  on public.issues for select
  to authenticated
  using (true);

create policy "Active accounts can create their own issues"
  on public.issues for insert
  to authenticated
  with check (auth.uid() = created_by and public.is_active_account());

create policy "Active accounts can update their own issues"
  on public.issues for update
  to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by and public.is_active_account());

create policy "Active accounts can delete their own issues"
  on public.issues for delete
  to authenticated
  using (auth.uid() = created_by and public.is_active_account());

-- tasks / materials / comments / votes : noms exacts connus (migration
-- 20260717030000) — remplacées une par une par leur équivalent durci.
drop policy "Only the parent issue's creator can insert tasks" on public.tasks;
create policy "Only the parent issue's creator can insert tasks"
  on public.tasks for insert
  to authenticated
  with check (
    public.is_active_account()
    and exists (
      select 1 from public.issues
      where issues.id = tasks.issue_id
        and issues.created_by = auth.uid()
    )
  );

drop policy "Only the parent issue's creator can delete tasks" on public.tasks;
create policy "Only the parent issue's creator can delete tasks"
  on public.tasks for delete
  to authenticated
  using (
    public.is_active_account()
    and exists (
      select 1 from public.issues
      where issues.id = tasks.issue_id
        and issues.created_by = auth.uid()
    )
  );

drop policy "Only the parent issue's creator can insert materials" on public.materials;
create policy "Only the parent issue's creator can insert materials"
  on public.materials for insert
  to authenticated
  with check (
    public.is_active_account()
    and exists (
      select 1 from public.issues
      where issues.id = materials.issue_id
        and issues.created_by = auth.uid()
    )
  );

drop policy "Only the parent issue's creator can delete materials" on public.materials;
create policy "Only the parent issue's creator can delete materials"
  on public.materials for delete
  to authenticated
  using (
    public.is_active_account()
    and exists (
      select 1 from public.issues
      where issues.id = materials.issue_id
        and issues.created_by = auth.uid()
    )
  );

drop policy "Users can post comments as themselves" on public.comments;
create policy "Active accounts can post comments as themselves"
  on public.comments for insert
  to authenticated
  with check (auth.uid() = id_user and public.is_active_account());

drop policy "Users can vote as themselves" on public.votes;
create policy "Active accounts can vote as themselves"
  on public.votes for insert
  to authenticated
  with check (auth.uid() = id_user and public.is_active_account());

-- storage.objects (migration 20260902100000) : avatars et issue-photos.
-- Seules les policies d'écriture (insert/update) sont durcies — bloquer la
-- suppression de son propre fichier n'apporte rien (le purge de J+30 le
-- supprimera de toute façon).
drop policy "Users can upload their own issue photos" on storage.objects;
create policy "Active accounts can upload their own issue photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'issue-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_active_account()
  );

drop policy "Users can update their own issue photos" on storage.objects;
create policy "Active accounts can update their own issue photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'issue-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_active_account()
  );

drop policy "Users can upload their own avatar" on storage.objects;
create policy "Active accounts can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_active_account()
  );

drop policy "Users can update their own avatar" on storage.objects;
create policy "Active accounts can update their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_active_account()
  );

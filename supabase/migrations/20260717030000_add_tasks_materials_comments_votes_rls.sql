-- BUG-10 follow-up (PLAN_CORRECTION_BOGUES.md): tasks/materials/comments/votes
-- still had a permissive "allow all" policy left over from initial setup and
-- testing, the same issue already fixed on `issues`. Drop whatever policies
-- currently exist on these four tables (name unknown/variable) and replace
-- them with scoped ones.

do $$
declare
  pol record;
begin
  for pol in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('tasks', 'materials', 'comments', 'votes')
  loop
    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- tasks / materials: no created_by of their own — ownership is the parent
-- issue's creator. Readable by anyone (shown on the public issue detail
-- page), writable only by whoever owns the parent issue (updateIssue does a
-- delete-then-insert of the full list on every edit).

alter table public.tasks enable row level security;

create policy "Authenticated users can read tasks"
  on public.tasks for select
  to authenticated
  using (true);

create policy "Only the parent issue's creator can insert tasks"
  on public.tasks for insert
  to authenticated
  with check (
    exists (
      select 1 from public.issues
      where issues.id = tasks.issue_id
        and issues.created_by = auth.uid()
    )
  );

create policy "Only the parent issue's creator can delete tasks"
  on public.tasks for delete
  to authenticated
  using (
    exists (
      select 1 from public.issues
      where issues.id = tasks.issue_id
        and issues.created_by = auth.uid()
    )
  );

alter table public.materials enable row level security;

create policy "Authenticated users can read materials"
  on public.materials for select
  to authenticated
  using (true);

create policy "Only the parent issue's creator can insert materials"
  on public.materials for insert
  to authenticated
  with check (
    exists (
      select 1 from public.issues
      where issues.id = materials.issue_id
        and issues.created_by = auth.uid()
    )
  );

create policy "Only the parent issue's creator can delete materials"
  on public.materials for delete
  to authenticated
  using (
    exists (
      select 1 from public.issues
      where issues.id = materials.issue_id
        and issues.created_by = auth.uid()
    )
  );

-- comments / votes: each row has its own author (id_user). Readable by
-- anyone, but a user can only ever write a row as themselves. No update/delete
-- policy on either — the app has no edit/delete feature for comments or
-- votes, so both stay blocked by default once RLS is enabled.

alter table public.comments enable row level security;

create policy "Authenticated users can read comments"
  on public.comments for select
  to authenticated
  using (true);

create policy "Users can post comments as themselves"
  on public.comments for insert
  to authenticated
  with check (auth.uid() = id_user);

alter table public.votes enable row level security;

create policy "Authenticated users can read votes"
  on public.votes for select
  to authenticated
  using (true);

create policy "Users can vote as themselves"
  on public.votes for insert
  to authenticated
  with check (auth.uid() = id_user);

-- Note privée des comptes mairie sur un signalement : une note par (signalement, compte),
-- lisible et modifiable uniquement par son auteur. Table séparée de `issues` car
-- celle-ci est lisible par tous les comptes authentifiés.
create table public.issue_private_notes (
  issue_id text not null references public.issues(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  note text not null check (char_length(note) between 1 and 2000),
  updated_at timestamptz not null default now(),
  primary key (issue_id, author_id)
);

alter table public.issue_private_notes enable row level security;

-- La sous-requête sur public.users passe par la RLS de users (chaque compte lit sa propre ligne).
create function public.is_municipal_account()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'municipal' and deleted_at is null
  );
$$;

create policy "Municipal authors can read their own notes"
  on public.issue_private_notes for select
  to authenticated
  using (author_id = auth.uid() and public.is_municipal_account());

create policy "Municipal authors can insert their own notes"
  on public.issue_private_notes for insert
  to authenticated
  with check (author_id = auth.uid() and public.is_municipal_account());

create policy "Municipal authors can update their own notes"
  on public.issue_private_notes for update
  to authenticated
  using (author_id = auth.uid() and public.is_municipal_account())
  with check (author_id = auth.uid() and public.is_municipal_account());

create policy "Municipal authors can delete their own notes"
  on public.issue_private_notes for delete
  to authenticated
  using (author_id = auth.uid() and public.is_municipal_account());

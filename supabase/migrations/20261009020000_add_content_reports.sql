-- Signalement de contenu (bouton « Signaler » sur un signalement ou un commentaire).
-- Obligation de mise à disposition d'un dispositif de notification pour un
-- hébergeur de contenus (LCEN) : cf. CGU §8.
--
-- Écriture seule côté client : aucune policy SELECT/UPDATE/DELETE, donc ni le
-- signaleur ni personne d'autre ne peut relire la table depuis l'application.
-- L'éditeur la consulte via le dashboard Supabase (rôle postgres, qui contourne
-- la RLS) : select * from public.content_reports where status = 'new';
create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  issue_id text not null references public.issues(id) on delete cascade,
  -- Sans clé étrangère : le type de comments.id n'est pas tracé dans les
  -- migrations versionnées (cf. MANUEL_MISE_A_JOUR.md §5). null = le signalement lui-même.
  comment_id text,
  reason text not null check (reason in ('illegal', 'harassment', 'privacy', 'spam', 'other')),
  details text check (details is null or char_length(details) <= 500),
  status text not null default 'new' check (status in ('new', 'handled')),
  created_at timestamptz not null default now()
);

-- Un compte ne signale qu'une fois un même contenu (comment_id null ramené à '').
create unique index content_reports_one_per_reporter
  on public.content_reports (reporter_id, issue_id, coalesce(comment_id, ''));

alter table public.content_reports enable row level security;

create policy "Active accounts can report content as themselves"
  on public.content_reports for insert
  to authenticated
  with check (reporter_id = auth.uid() and public.is_active_account());

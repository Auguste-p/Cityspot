-- BUG-12 correction (v2) : impossible d'écrire dans auth.users depuis l'app.
-- Le statut municipal doit donc vivre entièrement dans public.users, table
-- qu'on contrôle, plutôt que dans user_metadata (auth.users) comme la
-- première version du correctif le faisait.
alter table public.users
  add column if not exists role text not null default 'citizen';

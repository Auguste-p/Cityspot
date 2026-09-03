-- SEC : author_name (20260902090000) n'était contraint par aucune policy —
-- seul id_user = auth.uid() était vérifié à l'insertion (RLS "Users can post
-- comments as themselves"). Un appel REST direct pouvait donc garder son
-- propre id_user (valide) tout en usurpant n'importe quel author_name
-- ("Mairie de Lyon", le nom d'un autre habitant...), affiché tel quel sur
-- PostDetail.tsx. Le nom vient désormais toujours de public.users, jamais du
-- payload client, quelle que soit la valeur envoyée par le client.
-- Pas de "security definer" : la fonction s'exécute avec les droits de
-- l'appelant (RLS active), et id_user = auth.uid() est déjà garanti par la
-- policy d'insertion existante — l'appelant a donc toujours le droit de lire
-- sa propre ligne dans public.users ("Users can view their own profile").
create or replace function public.set_comment_author_name()
returns trigger
language plpgsql
as $$
begin
  select name into new.author_name from public.users where id = new.id_user;
  return new;
end;
$$;

create trigger set_comment_author_name
  before insert on public.comments
  for each row execute function public.set_comment_author_name();

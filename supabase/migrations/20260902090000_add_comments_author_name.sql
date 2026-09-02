-- La RLS sur public.users (SEC-11, CAHIER_DE_RECETTES.md) empêche un client
-- de lire le nom d'un autre utilisateur : "Users can view their own profile"
-- limite la lecture à sa propre ligne. Pour afficher le nom de l'auteur d'un
-- commentaire à tout lecteur, on le dénormalise à l'écriture (même pattern
-- que issues.owner_email) plutôt que de relire users depuis le client.
alter table public.comments add column if not exists author_name text;

update public.comments c
set author_name = u.name
from public.users u
where u.id = c.id_user
  and c.author_name is null;

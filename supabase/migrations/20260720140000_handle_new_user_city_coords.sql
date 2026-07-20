-- Étend handle_new_user() pour insérer cityLat/cityLng dans le même INSERT
-- que name/city, au lieu d'un update() client séparé après coup.
--
-- Pourquoi : l'update() client dépendait d'une session active juste après
-- auth.signUp() pour passer la RLS ("un utilisateur ne modifie que sa propre
-- fiche"). Ce projet exige la confirmation par email : il n'y a donc aucune
-- session à ce moment-là, l'update échouait silencieusement (0 ligne, pas
-- d'erreur) et cityLat/cityLng restaient null. Le trigger, lui, s'exécute
-- côté serveur indépendamment de toute session client — même mécanisme
-- fiable déjà utilisé pour name/city.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.users (id, name, city, "cityLat", "cityLng", created_at)
  values (
    new.id,
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'city',
    (new.raw_user_meta_data ->> 'cityLat')::double precision,
    (new.raw_user_meta_data ->> 'cityLng')::double precision,
    new.created_at
  );
  return new;
end;
$$;

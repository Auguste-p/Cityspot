-- Suppression de compte (soft delete) : cf.
-- docs/superpowers/specs/2026-09-29-account-deletion-design.md.
-- null = compte actif ; non-null = supprimé depuis cette date, jamais remis
-- à null après le purge de J+30 (irréversibilité définitive).
alter table public.users
  add column if not exists deleted_at timestamptz;

-- Un compte supprimé redevient introuvable via la vue publique, exactement
-- comme un profil non-public aujourd'hui (getPublicProfile() ne distingue
-- déjà pas les deux cas : les deux renvoient null).
create or replace view public.public_profiles as
select id, name, avatar, city, role
from public.users
where "profileVisible" = true
  and deleted_at is null;

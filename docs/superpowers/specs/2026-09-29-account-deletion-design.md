# Suppression de compte (soft delete + purge à J+30)

## Objectif

Permettre à un utilisateur connecté de supprimer son propre compte depuis
`Settings.tsx`. À partir de cet instant :

- il perd tout accès fonctionnel à son compte (aucune écriture possible) ;
- son nom disparaît partout où il apparaît actuellement (uniquement
  `comments.author_name` et le profil public — les signalements n'affichent
  jamais le nom de leur créateur) ;
- ses signalements, commentaires et votes restent visibles (décision produit :
  contenu conservé, auteur anonymisé) ;
- il peut annuler la suppression en se reconnectant dans les 30 jours ;
- passé les 30 jours, ses données personnelles (`public.users`, avatar) sont
  purgées définitivement et le compte n'est plus jamais réactivable.

## Hors périmètre (décisions explicites)

- **Pas de suppression en cascade des signalements/commentaires/votes** —
  seule l'identité de l'auteur est anonymisée, le contenu reste (utile à la
  collectivité).
- **`auth.users` n'est jamais supprimé ni modifié**, ni à la suppression ni au
  purge. Le supprimer réellement demanderait l'API Admin Supabase (clé
  service-role) ou des privilèges Postgres non garantis sur une instance
  managée — les deux sont hors de l'architecture actuelle (aucun composant
  serveur, aucune clé privilégiée côté client). Conséquence assumée : l'email
  reste indéfiniment "pris" (`email_exists` continuera de le signaler comme
  utilisé), même après la purge définitive. Le schéma `auth` n'est de toute
  façon jamais exposé par PostgREST — ce résidu n'est ni lisible ni
  exploitable par un client.
- **Pas de libération de l'email** pour permettre une réinscription — non
  demandé.
- **Le fichier avatar peut rester dans le bucket S3 sous-jacent** même après
  la purge. Supprimer la ligne `storage.objects` (ce que fait
  `purge_deleted_accounts()`) rend le fichier inaccessible via l'app, mais ne
  supprime pas forcément le fichier physique du bucket S3 : seule l'API
  Storage de Supabase le fait, ce qui demanderait une clé service-role — hors
  de l'architecture actuelle (voir plus haut).
- **Pas de nouveau composant de dialogue** — `window.confirm(...)`, comme la
  suppression d'un signalement dans `PostDetail.tsx`.

## Modèle de données

### `public.users`

Nouvelle colonne :

```sql
alter table public.users
  add column if not exists deleted_at timestamptz;
```

- `null` = compte actif.
- non-null = compte marqué supprimé depuis cette date. Reste non-null pour
  toujours une fois le purge de J+30 passé (jamais remis à `null` après ce
  point — irréversibilité définitive).

Le reste de la ligne (`name`, `phone`, `address`, `avatar`, `city`,
`cityLat`/`cityLng`, `profileVisible`) n'est **pas modifié** à la suppression
— seulement au purge de J+30 (voir plus bas). Ça respecte "données conservées
30 jours" : la donnée réelle reste en base, seul l'accès et l'affichage
changent immédiatement.

### `public.public_profiles` (vue)

Ajouter `deleted_at is null` au filtre existant :

```sql
create or replace view public.public_profiles as
select id, name, avatar, city, role
from public.users
where "profileVisible" = true
  and deleted_at is null;
```

Un profil supprimé redevient introuvable — même comportement que
"n'existe pas" ou "pas public" aujourd'hui (le code ne distingue déjà pas ces
deux cas, cf. `getPublicProfile()`). Aucun changement requis dans
`PublicProfile.tsx`.

## Fonctions RPC (`security definer`)

Même pattern déjà utilisé dans ce projet pour `handle_new_user()` et
`set_comment_author_name()` : une fonction Postgres avec des droits élevés,
mais dont le champ d'action est verrouillé sur `auth.uid()` en dur (aucun
paramètre acceptant un id arbitraire) — donc pas d'ouverture de policy
générale, pas de risque d'abus inter-comptes.

### `delete_own_account()`

```sql
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
    set deleted_at = now()
    where id = auth.uid() and deleted_at is null;

  -- author_name est dénormalisé à l'écriture (migration
  -- 20260902090000/20260903000000) : sans ce trigger manuel, les commentaires
  -- déjà postés garderaient l'ancien nom indéfiniment. Aucune policy UPDATE
  -- n'existe sur comments (volontairement) — d'où le security definer.
  update public.comments
    set author_name = 'Utilisateur supprimé'
    where id_user = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
```

Appelée depuis `authService.ts` via
`getSupabaseClient()!.rpc('delete_own_account')` — même pattern que
`email_exists`.

### `restore_own_account()`

```sql
create or replace function public.restore_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  did_restore boolean;
begin
  update public.users
    set deleted_at = null
    where id = auth.uid()
      and deleted_at is not null
      and deleted_at > now() - interval '30 days';

  did_restore := found;

  -- Symétrique de delete_own_account() : restaure le nom réel (toujours
  -- intact dans users.name, jamais touché avant le purge de J+30) sur les
  -- commentaires anonymisés. Le garde `did_restore` est nécessaire : sans
  -- lui, un appel sur un compte qui n'était pas en attente de suppression
  -- (deleted_at déjà null) écraserait quand même silencieusement
  -- l'historique de author_name avec le nom actuel de l'utilisateur.
  if did_restore then
    update public.comments
      set author_name = (select name from public.users where id = auth.uid())
      where id_user = auth.uid();
  end if;
end;
$$;

revoke all on function public.restore_own_account() from public;
grant execute on function public.restore_own_account() to authenticated;
```

## Durcissement RLS (blocage des écritures pendant les 30 jours)

Le `signOut()` client est immédiat, mais le token d'accès reste valide
jusqu'à son expiration naturelle (jusqu'à ~1h) — une requête REST directe
avec ce token pourrait théoriquement encore écrire. Conformément au principe
déjà affirmé dans `SECURITE.md`/`ARCHITECTURE.md` ("toute autorisation
réelle est appliquée côté Postgres, jamais côté React"), on ferme cette
fenêtre au niveau RLS plutôt que de s'appuyer uniquement sur le client.

Fonction utilitaire :

```sql
create or replace function public.is_active_account()
returns boolean
language sql
stable
as $$
  select not exists (
    select 1 from public.users where id = auth.uid() and deleted_at is not null
  );
$$;
```

À ajouter (`and public.is_active_account()`) dans le `with check`/`using` de
chaque policy d'écriture existante :

- `issues` — INSERT, UPDATE, DELETE. **Ces policies ne sont pas dans les
  migrations trackées** (elles précèdent l'historique versionné). Avant
  d'écrire la migration de durcissement, lister leur définition exacte avec
  `select * from pg_policies where tablename = 'issues';` dans le SQL editor
  Supabase, pour les reproduire à l'identique avec la clause en plus (ne pas
  deviner leur contenu).
- `comments` — INSERT (`"Users can post comments as themselves"`,
  migration `20260717030000`).
- `votes` — INSERT (`"Users can vote as themselves"`, même migration).
- `tasks` / `materials` — INSERT, DELETE (même migration).
- `storage.objects` — INSERT, UPDATE sur les buckets `avatars` et
  `issue-photos` (migration `20260902100000`).

Ne **pas** ajouter cette condition sur les policies de lecture (SELECT) —
le contenu doit rester visible normalement, seule l'écriture est bloquée.

## Purge définitive (J+30)

Extension `pg_cron` — tourne entièrement dans Postgres, cohérent avec
l'absence de composant serveur. **Prérequis de déploiement (côté Supabase,
hors code)** : activer l'extension (Database → Extensions dans le
dashboard, ou `create extension if not exists pg_cron;` si le projet
l'autorise en migration).

```sql
create or replace function public.purge_deleted_accounts()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target record;
begin
  for target in
    select id from public.users
    where deleted_at is not null
      and deleted_at < now() - interval '30 days'
      and name is distinct from 'Utilisateur supprimé'  -- déjà purgé, ignore
  loop
    update public.users
      set name = 'Utilisateur supprimé',
          phone = null,
          address = null,
          avatar = null,
          city = null,
          "cityLat" = null,
          "cityLng" = null,
          "profileVisible" = false
      where id = target.id;

    delete from storage.objects
      where bucket_id = 'avatars'
        and (storage.foldername(name))[1] = target.id::text;
  end loop;
end;
$$;

select cron.schedule(
  'purge-deleted-accounts',
  '0 3 * * *',
  $$select public.purge_deleted_accounts();$$
);
```

La ligne `public.users` **reste en place** (id conservé) — sinon les clés
étrangères de `issues.created_by`, `comments.id_user`, `votes.id_user`
casseraient ou entraîneraient une cascade qui supprimerait le contenu qu'on a
décidé de garder.

## Client — `authService.ts`

```ts
export async function deleteOwnAccount() {
  const { error } = await getSupabaseClient()!.rpc('delete_own_account');
  if (error) throw error;
}

export async function restoreOwnAccount() {
  const { error } = await getSupabaseClient()!.rpc('restore_own_account');
  if (error) throw error;
}
```

## Client — `UserContext.tsx`

- `fetchProfile()` sélectionne aussi `deleted_at`.
- `AppUser` (ou un état séparé du contexte, ex. `pendingDeletion: { deletedAt: Date } | null`) expose l'information plutôt que de la cacher :
  - `deleted_at` non-null et `< 30 jours` → ne pas construire un `AppUser`
    normal ; exposer l'état "en attente de suppression" pour que l'UI affiche
    l'écran de restauration à la place de l'app.
  - `deleted_at` non-null et `>= 30 jours` (cas limite si le cron n'est pas
    encore passé) → déconnexion silencieuse (`signOut()`), `user = null`,
    même comportement qu'un visiteur.

## UI

### `Settings.tsx`

- Section "Zone dangereuse" en bas de page, bouton destructif "Supprimer mon
  compte".
- `window.confirm('Supprimer définitivement votre compte ? Vous perdrez immédiatement l'accès. Vos données seront effacées sous 30 jours.')`
  — même pattern que `PostDetail.tsx` pour la suppression d'un signalement.
- Sur confirmation : `deleteOwnAccount()` → `signOut()` → `navigate('/login')`
  → toast (`sonner`) "Compte supprimé. Vos données seront effacées
  définitivement sous 30 jours."

### Écran de restauration (nouveau, affiché à la place de l'app quand `pendingDeletion` est actif)

- Message : "Votre compte a été supprimé le {deletedAt}. Il sera
  définitivement effacé le {deletedAt + 30j}. Voulez-vous le restaurer ?"
- Deux actions :
  - **Restaurer** → `restoreOwnAccount()` → `refreshUser()` (recharge un
    `AppUser` normal).
  - **Annuler / Se déconnecter** → `signOut()` (le compte reste marqué
    supprimé, la fenêtre de 30 jours continue de courir).

## Tests (a minima, un par comportement non trivial)

- RPC `delete_own_account()` : marque `deleted_at`, anonymise les
  `author_name` des commentaires de l'utilisateur, ne touche pas ceux des
  autres.
- RPC `restore_own_account()` : restaure `deleted_at` et les
  `author_name` si appelé < 30 jours ; no-op si > 30 jours ; no-op complet
  (n'écrase pas `author_name`) si appelé sur un compte qui n'était pas en
  attente de suppression.
- RLS : un compte avec `deleted_at` non-null ne peut plus insérer de
  commentaire/vote/signalement (policy `is_active_account()`).
- `purge_deleted_accounts()` : anonymise `public.users` et supprime l'avatar
  Storage pour les comptes `deleted_at < now() - 30j` ; ignore les autres ;
  idempotent (ne re-traite pas un compte déjà anonymisé).
- `UserContext` : un utilisateur avec `deleted_at` récent obtient l'état
  "pending deletion" au lieu d'un `AppUser` normal ; un `deleted_at` ancien
  entraîne une déconnexion silencieuse.
- `Settings.tsx` : clic sur "Supprimer mon compte" + confirmation appelle
  `deleteOwnAccount()` puis redirige vers `/login`.

## Migrations à créer

1. `add_users_deleted_at.sql` — colonne + vue `public_profiles` mise à jour.
2. `add_account_deletion_rpcs.sql` — `delete_own_account()`,
   `restore_own_account()`.
3. `harden_rls_for_deleted_accounts.sql` — `is_active_account()` + mise à
   jour des policies listées ci-dessus (issues en premier, après avoir
   relu leur définition exacte dans le dashboard).
4. `add_purge_deleted_accounts_job.sql` — fonction + `cron.schedule(...)`
   (suppose l'extension `pg_cron` déjà activée manuellement).

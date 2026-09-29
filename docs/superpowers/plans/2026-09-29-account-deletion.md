# Suppression de compte (soft delete + purge J+30) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a logged-in user delete their own account from `Settings.tsx`. They lose access immediately, their name is anonymized everywhere it's denormalized, their content (issues/comments/votes) stays, they can undo by logging back in within 30 days, and their personal data is purged for good after that.

**Architecture:** Everything lives in Postgres (no server component, no service-role key anywhere — matches this project's existing architecture). Two `security definer` RPCs (`delete_own_account`/`restore_own_account`) scoped hard to `auth.uid()`, an `is_active_account()` guard added to every write-policy, and a `pg_cron` job doing the J+30 purge. The client adds a `pendingDeletion` branch to `UserContext` and a dedicated gate screen, plus a delete button in `Settings.tsx`.

**Tech Stack:** React 19 + TypeScript + Vite, Supabase (Postgres + RLS + pg_cron), Vitest + Testing Library, Zod, react-hook-form, sonner.

**Spec:** `docs/superpowers/specs/2026-09-29-account-deletion-design.md`

## Global Constraints

- No service-role key, no Edge Function, no server component — every privileged operation is a Postgres `security definer` function, matching the existing `handle_new_user()`/`set_comment_author_name()` pattern.
- Content (issues/comments/votes) is **never** deleted — only the author's identity is anonymized. Decision from the spec, do not deviate.
- `auth.users` is never touched, at deletion or at purge. Documented limitation (see spec) — do not attempt to delete or modify it.
- `public.users` row is never deleted, even at purge — only its PII columns are nulled/anonymized in place, so FKs from issues/comments/votes stay valid.
- Destructive-action confirmation uses `window.confirm(...)`, matching `PostDetail.tsx` — no new dialog component.
- Migrations that touch the live Supabase project (`supabase db push`) are run by the user, never by an agent — see Task 11.

---

### Task 1: Migration — `deleted_at` column + `public_profiles` view

**Files:**
- Create: `supabase/migrations/20260929010000_add_users_deleted_at.sql`

**Interfaces:**
- Produces: `public.users.deleted_at` (`timestamptz`, nullable) — every later task reads/writes this column.

- [ ] **Step 1: Write the migration**

```sql
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
```

- [ ] **Step 2: Note for Task 11**

This file is not applied yet — `supabase db push` runs once, at the end, in Task 11. Move on to Task 2.

---

### Task 2: Migration — `delete_own_account()` / `restore_own_account()` RPCs

**Files:**
- Create: `supabase/migrations/20260929020000_add_account_deletion_rpcs.sql`

**Interfaces:**
- Consumes: `public.users.deleted_at` (Task 1).
- Produces: RPC functions `delete_own_account()` and `restore_own_account()`, callable via `.rpc('delete_own_account')` / `.rpc('restore_own_account')` — Task 6 (`authService.ts`) calls these by exact name.

- [ ] **Step 1: Write the migration**

```sql
-- delete_own_account()/restore_own_account() : cf.
-- docs/superpowers/specs/2026-09-29-account-deletion-design.md.
-- Même pattern que handle_new_user()/set_comment_author_name() déjà dans ce
-- projet : security definer scopé en dur sur auth.uid(), aucun paramètre
-- acceptant un id arbitraire — impossible à détourner contre un autre compte.
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

  -- author_name est dénormalisé à l'écriture (migrations 20260902090000 et
  -- 20260903000000) : sans cette mise à jour manuelle, les commentaires déjà
  -- postés garderaient l'ancien nom indéfiniment. Aucune policy UPDATE
  -- n'existe sur comments (volontairement) — d'où le security definer.
  update public.comments
    set author_name = 'Utilisateur supprimé'
    where id_user = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

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

  -- Garde nécessaire : sans elle, un appel sur un compte qui n'était pas en
  -- attente de suppression écraserait quand même l'historique de
  -- author_name avec le nom actuel de l'utilisateur.
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

- [ ] **Step 2**: Move on to Task 3 — not applied yet (Task 11).

---

### Task 3: Migration — RLS hardening for deleted accounts

**Files:**
- Create: `supabase/migrations/20260929030000_harden_rls_for_deleted_accounts.sql`

**Interfaces:**
- Consumes: `public.users.deleted_at` (Task 1).
- Produces: `public.is_active_account()` — a boolean helper other future migrations can reuse.

- [ ] **Step 1: Write the migration**

```sql
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
```

- [ ] **Step 2: Flag the one assumption this task makes**

Before Task 11 pushes this migration, run this read-only query in the Supabase SQL editor and confirm the `issues` policies it drops really are just "read open / write-or-delete restricted to `created_by`" (no extra condition this plan doesn't know about, e.g. a status check):

```sql
select policyname, cmd, qual, with_check from pg_policies where tablename = 'issues';
```

If it reveals extra conditions, adjust the three `issues` policies above before pushing — do not push blind.

---

### Task 4: Migration — J+30 purge job

**Files:**
- Create: `supabase/migrations/20260929040000_add_purge_deleted_accounts_job.sql`

**Interfaces:**
- Consumes: `public.users.deleted_at` (Task 1).

- [ ] **Step 1: Write the migration**

```sql
-- Purge définitive à J+30 : cf.
-- docs/superpowers/specs/2026-09-29-account-deletion-design.md.
-- Prérequis MANUEL (hors migration, à faire une fois avant de pousser ce
-- fichier) : activer l'extension pg_cron — Database → Extensions dans le
-- dashboard Supabase. Sans elle, `cron.schedule` ci-dessous échoue.
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

- [ ] **Step 2**: Move on to Task 5 — not applied yet (Task 11).

---

### Task 5: Supabase client types — `deleted_at` + RPC functions

**Files:**
- Modify: `src/lib/supabase.ts:132-195` (the `Database['public']` type)

**Interfaces:**
- Produces: typed `.rpc('delete_own_account')` / `.rpc('restore_own_account')` calls for Task 6; typed `deleted_at` column for Task 7.

- [ ] **Step 1: Add `deleted_at` to the `users` table type**

In `src/lib/supabase.ts`, in the `users` table type, add `deleted_at` to `Row`, `Insert`, and `Update`:

```ts
      users: {
        Row: {
          id: string;
          name: string | null;
          city: string | null;
          cityLat: number | null;
          cityLng: number | null;
          role: string;
          phone: string | null;
          address: string | null;
          avatar: string | null;
          emailNotifications: boolean;
          profileVisible: boolean;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          name?: string | null;
          city?: string | null;
          cityLat?: number | null;
          cityLng?: number | null;
          role?: string;
          phone?: string | null;
          address?: string | null;
          avatar?: string | null;
          emailNotifications?: boolean;
          profileVisible?: boolean;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          name?: string | null;
          city?: string | null;
          cityLat?: number | null;
          cityLng?: number | null;
          role?: string;
          phone?: string | null;
          address?: string | null;
          avatar?: string | null;
          emailNotifications?: boolean;
          profileVisible?: boolean;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
```

- [ ] **Step 2: Add the two RPC functions to the `Functions` type**

```ts
    Functions: {
      email_exists: {
        Args: { check_email: string };
        Returns: boolean;
      };
      delete_own_account: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      restore_own_account: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (no other file references these types yet, this is additive)

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase.ts
git commit -m "feat: type deleted_at column and account-deletion RPCs"
```

---

### Task 6: `authService.ts` — `deleteOwnAccount()` / `restoreOwnAccount()`

**Files:**
- Modify: `src/services/authService.ts` (add two exported functions at the end of the file)
- Test: `src/services/authService.test.ts`

**Interfaces:**
- Consumes: `getSupabaseClient()` from `../lib/supabase` (already imported in this file); RPC names from Task 2/5.
- Produces: `deleteOwnAccount(): Promise<void>`, `restoreOwnAccount(): Promise<void>` — Task 8 (`AccountDeletionGate.tsx`) and Task 10 (`Settings.tsx`) call these.

- [ ] **Step 1: Write the failing tests**

Add to `src/services/authService.test.ts`, after the `describe('updateUserProfile', ...)` block, and add `deleteOwnAccount, restoreOwnAccount` to the existing import from `./authService`:

```ts
describe('deleteOwnAccount', () => {
  it('calls the delete_own_account RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    mockedGetSupabaseClient.mockReturnValue({ rpc } as any);

    await deleteOwnAccount();

    expect(rpc).toHaveBeenCalledWith('delete_own_account');
  });

  it('throws when the RPC errors', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: new Error('boom') });
    mockedGetSupabaseClient.mockReturnValue({ rpc } as any);

    await expect(deleteOwnAccount()).rejects.toThrow('boom');
  });
});

describe('restoreOwnAccount', () => {
  it('calls the restore_own_account RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    mockedGetSupabaseClient.mockReturnValue({ rpc } as any);

    await restoreOwnAccount();

    expect(rpc).toHaveBeenCalledWith('restore_own_account');
  });

  it('throws when the RPC errors', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: new Error('boom') });
    mockedGetSupabaseClient.mockReturnValue({ rpc } as any);

    await expect(restoreOwnAccount()).rejects.toThrow('boom');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/services/authService.test.ts`
Expected: FAIL — `deleteOwnAccount`/`restoreOwnAccount` are not exported by `./authService`

- [ ] **Step 3: Implement**

Append to `src/services/authService.ts`:

```ts
// 🗑️ Suppression du compte : marque deleted_at et anonymise les
// commentaires déjà postés (author_name dénormalisé). Voir
// delete_own_account() côté base — security definer, scopé sur auth.uid().
export async function deleteOwnAccount() {
  const { error } = await getSupabaseClient()!.rpc('delete_own_account');
  if (error) throw error;
}

// ♻️ Annule une suppression demandée il y a moins de 30 jours.
export async function restoreOwnAccount() {
  const { error } = await getSupabaseClient()!.rpc('restore_own_account');
  if (error) throw error;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/authService.test.ts`
Expected: PASS (19 tests: 15 existing + 4 new)

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/services/authService.ts src/services/authService.test.ts
git commit -m "feat: add deleteOwnAccount/restoreOwnAccount to authService"
```

---

### Task 7: `UserContext.tsx` — `pendingDeletion` state

**Files:**
- Modify: `src/context/UserContext.tsx` (full rewrite of the file body, same exports)
- Test: `src/context/UserContext.test.tsx`

**Interfaces:**
- Consumes: `deleted_at` column (Task 1/5).
- Produces: `useUser()` now also returns `pendingDeletion?: { deletedAt: Date } | null`. `pendingDeletion` is **optional** on purpose (not required) so the 7 other test files that already mock `useUser()` (`CreatePost.test.tsx`, `Layout.test.tsx`, `MapView.test.tsx`, `MunicipalView.test.tsx`, `PostDetail.test.tsx`, `Profile.test.tsx`, `Settings.test.tsx` — 25 call sites total) keep compiling unchanged; `undefined` behaves exactly like `null` for every consumer (`if (pendingDeletion)`). Task 8/9 (`AccountDeletionGate`/`Layout`) are the only consumers that read it.

- [ ] **Step 1: Write the failing tests**

In `src/context/UserContext.test.tsx`, replace the `stubAuth` helper and `Probe` component with versions that also handle `deleted_at`, and add an `auth.signOut` mock:

```tsx
function stubAuth(
  getUser: () => Promise<{ data: { user: any } }>,
  profileRow?: { role?: string; cityLat?: number; cityLng?: number; deleted_at?: string },
) {
  return {
    auth: {
      getUser: vi.fn(getUser),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: profileRow ?? null, error: null }),
        }),
      }),
    }),
  } as any;
}

function Probe() {
  const { user, loading, isMunicipalUser, pendingDeletion } = useUser();
  if (loading) return <div>loading</div>;
  return (
    <div>
      <span data-testid="email">{user?.email ?? 'none'}</span>
      <span data-testid="role">{user?.role ?? 'none'}</span>
      <span data-testid="municipal">{String(isMunicipalUser)}</span>
      <span data-testid="city-coords">{user?.cityLat ?? 'none'},{user?.cityLng ?? 'none'}</span>
      <span data-testid="pending-deletion">{pendingDeletion ? pendingDeletion.deletedAt.toISOString() : 'none'}</span>
    </div>
  );
}
```

Add two new tests at the end of the `describe('UserProvider', ...)` block:

```tsx
  it('exposes pendingDeletion for an account deleted less than 30 days ago, without a normal user', async () => {
    const deletedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
    mockedGetSupabaseClient.mockReturnValue(
      stubAuth(
        async () => ({ data: { user: { id: 'u4', email: 'd@x.com', user_metadata: {} } } }),
        { role: 'citizen', deleted_at: deletedAt.toISOString() },
      ),
    );

    render(<UserProvider><Probe /></UserProvider>);

    expect((await screen.findByTestId('pending-deletion')).textContent).toBe(deletedAt.toISOString());
    expect(screen.getByTestId('email').textContent).toBe('none');
  });

  it('signs out silently for an account deleted 30+ days ago', async () => {
    const deletedAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000); // 31 days ago
    const client = stubAuth(
      async () => ({ data: { user: { id: 'u5', email: 'old@x.com', user_metadata: {} } } }),
      { role: 'citizen', deleted_at: deletedAt.toISOString() },
    );
    mockedGetSupabaseClient.mockReturnValue(client);

    render(<UserProvider><Probe /></UserProvider>);

    expect((await screen.findByTestId('pending-deletion')).textContent).toBe('none');
    expect(screen.getByTestId('email').textContent).toBe('none');
    expect(client.auth.signOut).toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/context/UserContext.test.tsx`
Expected: FAIL — `pendingDeletion` is `undefined` on the context value, `Probe` renders `'none'` where the test expects the ISO date; second test fails because `signOut` was never called.

- [ ] **Step 3: Implement**

Replace the full contents of `src/context/UserContext.tsx` with:

```tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabase';

export type UserRole = 'citizen' | 'municipal';

export interface AppUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: UserRole;
  city?: string;
  cityLat?: number;
  cityLng?: number;
}

export interface PendingDeletion {
  deletedAt: Date;
}

interface UserContextValue {
  user: AppUser | null;
  loading: boolean;
  isMunicipalUser: boolean;
  refreshUser: () => Promise<void>;
  pendingDeletion?: PendingDeletion | null;
}

const UserContext = createContext<UserContextValue | null>(null);

const DELETION_RETENTION_DAYS = 30;

interface Profile {
  role: UserRole;
  name?: string;
  avatar?: string;
  city?: string;
  cityLat?: number;
  cityLng?: number;
  deletedAt?: Date;
}

// Source of truth for the municipal role: public.users.role, not
// auth.users.user_metadata — the app has no write access to auth.users.
// Coordonnées de la ville : renseignées à l'inscription (LoginPage), utilisées
// pour centrer la carte à la connexion (MapView) sans devoir géolocaliser.
async function fetchProfile(userId: string): Promise<Profile> {
  const client = getSupabaseClient();
  if (!client) return { role: 'citizen' };

  const { data } = await client
    .from('users')
    .select('role, name, avatar, city, cityLat, cityLng, deleted_at')
    .eq('id', userId)
    .maybeSingle();

  return {
    role: data?.role === 'municipal' ? 'municipal' : 'citizen',
    name: data?.name ?? undefined,
    avatar: data?.avatar ?? undefined,
    city: data?.city ?? undefined,
    cityLat: data?.cityLat ?? undefined,
    cityLng: data?.cityLng ?? undefined,
    deletedAt: data?.deleted_at ? new Date(data.deleted_at) : undefined,
  };
}

function toAppUser(u: User, profile: Profile): AppUser {
  return {
    id: u.id,
    email: u.email!,
    // public.users.name/avatar sont éditables depuis Settings (updateUserProfile) ;
    // le user_metadata Auth, lui, n'est écrit qu'à l'inscription et jamais
    // resynchronisé — s'y fier en priorité affichait l'email/rien pour tout
    // compte modifié ou plus ancien.
    name: profile.name || u.user_metadata?.name || u.email!,
    avatar: profile.avatar || u.user_metadata?.avatar || '',
    role: profile.role,
    city: profile.city,
    cityLat: profile.cityLat,
    cityLng: profile.cityLng,
  };
}

interface ResolvedSession {
  user: AppUser | null;
  pendingDeletion: PendingDeletion | null;
  expiredDeletion: boolean;
}

// Résout la session Supabase en trois branches : pas de compte (déconnecté),
// compte marqué supprimé depuis moins de 30 jours (accès bloqué, restauration
// proposée), ou compte actif normal. Le cas "supprimé depuis 30 jours ou
// plus" ne devrait pas arriver en pratique (purge_deleted_accounts tourne
// chaque nuit) mais reste géré : déconnexion silencieuse plutôt que de
// bloquer indéfiniment sur l'écran de restauration.
async function resolveSession(u: User): Promise<ResolvedSession> {
  const profile = await fetchProfile(u.id);

  if (profile.deletedAt) {
    const ageMs = Date.now() - profile.deletedAt.getTime();
    const expired = ageMs >= DELETION_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    return {
      user: null,
      pendingDeletion: expired ? null : { deletedAt: profile.deletedAt },
      expiredDeletion: expired,
    };
  }

  return { user: toAppUser(u, profile), pendingDeletion: null, expiredDeletion: false };
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = async (sessionUser: User | null) => {
    if (!sessionUser) {
      setUser(null);
      setPendingDeletion(null);
      return;
    }

    const resolved = await resolveSession(sessionUser);
    if (resolved.expiredDeletion) {
      await getSupabaseClient()!.auth.signOut();
    }
    setUser(resolved.user);
    setPendingDeletion(resolved.pendingDeletion);
  };

  const loadUser = async () => {
    setLoading(true);
    try {
      const { data } = await getSupabaseClient()!.auth.getUser();
      await applySession(data.user);
    } catch {
      setUser(null);
      setPendingDeletion(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUser();

    const { data: listener } = getSupabaseClient()!.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user) {
          setUser(null);
          setPendingDeletion(null);
          setLoading(false);
          return;
        }

        void applySession(session.user).then(() => setLoading(false));
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const value: UserContextValue = {
    user,
    loading,
    isMunicipalUser: user?.role === 'municipal',
    refreshUser: loadUser,
    pendingDeletion,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }

  return context;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/context/UserContext.test.tsx`
Expected: PASS (8 tests: 6 existing — 5 in `describe('UserProvider', ...)` + 1 in `describe('useUser', ...)` — plus 2 new)

- [ ] **Step 5: Typecheck and full test suite**

Run: `npm run typecheck && npm test`
Expected: PASS — the 7 files mocking `useUser()` still compile because `pendingDeletion` is optional.

- [ ] **Step 6: Commit**

```bash
git add src/context/UserContext.tsx src/context/UserContext.test.tsx
git commit -m "feat: add pendingDeletion state to UserContext"
```

---

### Task 8: `AccountDeletionGate` component

**Files:**
- Create: `src/components/AccountDeletionGate.tsx`
- Test: `src/components/AccountDeletionGate.test.tsx`

**Interfaces:**
- Consumes: `useUser().refreshUser` (Task 7), `restoreOwnAccount`/`signOut` from `../services/authService` (Task 6 + existing `signOut`).
- Produces: `AccountDeletionGate({ deletedAt: Date })` — a full-screen component. Task 9 (`Layout.tsx`) renders it.

- [ ] **Step 1: Write the failing tests**

Create `src/components/AccountDeletionGate.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';

vi.mock('../context/UserContext', () => ({
  useUser: vi.fn(),
}));

vi.mock('../services/authService', () => ({
  restoreOwnAccount: vi.fn(),
  signOut: vi.fn(),
}));

import { useUser } from '../context/UserContext';
import { restoreOwnAccount, signOut } from '../services/authService';
import { AccountDeletionGate } from './AccountDeletionGate';

const mockedUseUser = vi.mocked(useUser);
const mockedRestoreOwnAccount = vi.mocked(restoreOwnAccount);
const mockedSignOut = vi.mocked(signOut);

const DELETED_AT = new Date('2026-09-01T00:00:00.000Z');

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('AccountDeletionGate accessibility (RGAA / axe-core)', () => {
  it('has no violation', async () => {
    mockedUseUser.mockReturnValue({ user: null, loading: false, isMunicipalUser: false, refreshUser: vi.fn(), pendingDeletion: null });

    const { container } = render(<AccountDeletionGate deletedAt={DELETED_AT} />);
    await expectNoA11yViolations(container);
  });
});

describe('AccountDeletionGate', () => {
  it('restores the account and refreshes the session on confirmation', async () => {
    const refreshUser = vi.fn();
    mockedUseUser.mockReturnValue({ user: null, loading: false, isMunicipalUser: false, refreshUser, pendingDeletion: null });
    mockedRestoreOwnAccount.mockResolvedValue(undefined);

    render(<AccountDeletionGate deletedAt={DELETED_AT} />);
    fireEvent.click(screen.getByText('Restaurer mon compte'));

    await waitFor(() => expect(mockedRestoreOwnAccount).toHaveBeenCalled());
    expect(refreshUser).toHaveBeenCalled();
    expect(mockedSignOut).not.toHaveBeenCalled();
  });

  it('signs out without restoring when declined', async () => {
    const refreshUser = vi.fn();
    mockedUseUser.mockReturnValue({ user: null, loading: false, isMunicipalUser: false, refreshUser, pendingDeletion: null });
    mockedSignOut.mockResolvedValue(undefined);

    render(<AccountDeletionGate deletedAt={DELETED_AT} />);
    fireEvent.click(screen.getByText('Se déconnecter'));

    await waitFor(() => expect(mockedSignOut).toHaveBeenCalled());
    expect(mockedRestoreOwnAccount).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/AccountDeletionGate.test.tsx`
Expected: FAIL — the module `./AccountDeletionGate` does not exist.

- [ ] **Step 3: Implement**

Create `src/components/AccountDeletionGate.tsx`:

```tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { restoreOwnAccount, signOut } from '../services/authService';
import { useUser } from '../context/UserContext';
import { Card } from './ui/card';
import { Button } from './ui/button';

const RETENTION_DAYS = 30;

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function AccountDeletionGate({ deletedAt }: { deletedAt: Date }) {
  const { refreshUser } = useUser();
  const [busy, setBusy] = useState(false);
  const purgeDate = new Date(deletedAt.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const handleRestore = async () => {
    setBusy(true);
    try {
      await restoreOwnAccount();
      toast.success('Compte restauré.');
      await refreshUser();
    } catch (error) {
      console.error(error);
      toast.error('Impossible de restaurer le compte');
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    setBusy(true);
    await signOut();
    await refreshUser();
  };

  return (
    <div className="h-screen flex items-center justify-center p-6">
      <Card className="p-8 text-center max-w-sm w-full space-y-4">
        <h2>Compte supprimé</h2>
        <p className="text-sm text-muted-foreground">
          Votre compte a été supprimé le {formatDate(deletedAt)}. Il sera
          définitivement effacé le {formatDate(purgeDate)}.
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={handleRestore} disabled={busy}>
            Restaurer mon compte
          </Button>
          <Button variant="ghost" onClick={handleDecline} disabled={busy}>
            Se déconnecter
          </Button>
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/AccountDeletionGate.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/AccountDeletionGate.tsx src/components/AccountDeletionGate.test.tsx
git commit -m "feat: add AccountDeletionGate component"
```

---

### Task 9: Wire the gate into `Layout.tsx`

**Files:**
- Modify: `src/components/Layout.tsx`
- Test: `src/components/Layout.test.tsx`

**Interfaces:**
- Consumes: `AccountDeletionGate` (Task 8), `pendingDeletion` from `useUser()` (Task 7).

- [ ] **Step 1: Write the failing test**

Add to `src/components/Layout.test.tsx`, inside `describe('Layout accessibility (RGAA / axe-core)', ...)`:

```tsx
  it('the account-deletion gate has no violation', async () => {
    mockedUseUser.mockReturnValue({
      user: null,
      loading: false,
      isMunicipalUser: false,
      refreshUser: vi.fn(),
      pendingDeletion: { deletedAt: new Date('2026-09-01T00:00:00.000Z') },
    });

    const { container } = renderLayout();
    await screen.findByText('Compte supprimé');
    await expectNoA11yViolations(container);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Layout.test.tsx`
Expected: FAIL — `Layout` still redirects to `/login` (no `user`) instead of rendering the gate; "Compte supprimé" never appears.

- [ ] **Step 3: Implement**

In `src/components/Layout.tsx`:

Replace this import line:
```tsx
import { useUser } from '../context/UserContext';
```
with:
```tsx
import { useUser } from '../context/UserContext';
import { AccountDeletionGate } from './AccountDeletionGate';
```

Replace:
```tsx
  const { user, loading, isMunicipalUser } = useUser();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
```
with:
```tsx
  const { user, loading, isMunicipalUser, pendingDeletion } = useUser();

  useEffect(() => {
    if (loading || pendingDeletion) return;

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
```

Add `pendingDeletion` to the effect's dependency array — replace:
```tsx
  }, [user, loading, isMunicipalUser, location.pathname, navigate]);
```
with:
```tsx
  }, [user, loading, isMunicipalUser, pendingDeletion, location.pathname, navigate]);
```

Add the early return right after the `isActive` helper — replace:
```tsx
  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
```
with:
```tsx
  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  if (pendingDeletion) {
    return <AccountDeletionGate deletedAt={pendingDeletion.deletedAt} />;
  }

  return (
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Layout.test.tsx`
Expected: PASS (3 tests: 2 existing + 1 new)

- [ ] **Step 5: Typecheck and full test suite**

Run: `npm run typecheck && npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/Layout.tsx src/components/Layout.test.tsx
git commit -m "feat: gate the app behind AccountDeletionGate when pendingDeletion is set"
```

---

### Task 10: `Settings.tsx` — "Zone dangereuse" delete button

**Files:**
- Modify: `src/components/Settings.tsx`
- Test: `src/components/Settings.test.tsx`

**Interfaces:**
- Consumes: `deleteOwnAccount`, `signOut` from `../services/authService` (Task 6, `signOut` already existed).

- [ ] **Step 1: Write the failing test**

In `src/components/Settings.test.tsx`, add `deleteOwnAccount: vi.fn()` to the existing `vi.mock('../services/authService', ...)` factory:

```ts
vi.mock('../services/authService', () => ({
  getUserProfile: vi.fn(),
  signOut: vi.fn(),
  updateUserProfile: vi.fn(),
  deleteOwnAccount: vi.fn(),
}));
```

Add a new test at the end of `describe('Settings accessibility (RGAA / axe-core)', ...)`:

```tsx
  it('the "danger zone" delete-account section has no violation', async () => {
    mockedUseUser.mockReturnValue({ user: CITIZEN, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    mockedGetUserProfile.mockResolvedValue({
      id: CITIZEN.id,
      name: 'Jeanne Dupont',
      city: 'Lyon',
      cityLat: null,
      cityLng: null,
      role: 'citizen',
      phone: '0601020304',
      address: '1 rue de la Paix',
      avatar: 'J',
      emailNotifications: true,
      profileVisible: false,
      created_at: '2026-01-01T00:00:00.000Z',
    });

    const { container } = renderSettings();
    await screen.findByText('Supprimer mon compte');
    await expectNoA11yViolations(container);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Settings.test.tsx`
Expected: FAIL — no "Supprimer mon compte" text in the rendered output.

- [ ] **Step 3: Implement**

In `src/components/Settings.tsx`, add `deleteOwnAccount` to the existing import from `../services/authService`:

```ts
import { deleteOwnAccount, getUserProfile, signOut, updateUserProfile } from '../services/authService';
```

Add a handler next to `handleLogout`:

```tsx
  const handleDeleteAccount = async () => {
    if (!window.confirm(
      'Supprimer définitivement votre compte ? Vous perdrez immédiatement l\'accès. Vos données seront effacées sous 30 jours.'
    )) return;

    try {
      await deleteOwnAccount();
      await signOut();
      toast.success('Compte supprimé. Vos données seront effacées définitivement sous 30 jours.');
      navigate('/login', { replace: true });
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la suppression du compte');
    }
  };
```

Add the "Zone dangereuse" card right after the "Se déconnecter" button and before the version paragraph — replace:

```tsx
            <Button
              type="button"
              onClick={handleLogout}
              variant="destructive"
              className="w-full flex items-center justify-center gap-2"
            >
              <LogOut className="size-5" />
              Se déconnecter
            </Button>

            <p className="text-center text-xs text-muted-foreground mt-1">
```

with:

```tsx
            <Button
              type="button"
              onClick={handleLogout}
              variant="destructive"
              className="w-full flex items-center justify-center gap-2"
            >
              <LogOut className="size-5" />
              Se déconnecter
            </Button>

            <Card className="p-6 border-destructive/50">
              <h2 className="mb-2">Zone dangereuse</h2>
              <p className="text-sm text-muted-foreground mb-4">
                La suppression de votre compte est immédiate : vous perdez l'accès
                tout de suite. Vos données personnelles sont conservées 30 jours
                (le temps d'annuler en vous reconnectant) puis effacées
                définitivement.
              </p>
              <Button
                type="button"
                onClick={handleDeleteAccount}
                variant="destructive"
                className="w-full"
              >
                Supprimer mon compte
              </Button>
            </Card>

            <p className="text-center text-xs text-muted-foreground mt-1">
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Settings.test.tsx`
Expected: PASS (3 tests: 2 existing + 1 new)

- [ ] **Step 5: Typecheck and full test suite**

Run: `npm run typecheck && npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/Settings.tsx src/components/Settings.test.tsx
git commit -m "feat: add account deletion button to Settings"
```

---

### Task 11: Full verification + database deployment (manual)

**Files:** none (verification only)

- [ ] **Step 1: Full local verification**

Run: `npm run typecheck && npm run lint && npm test && npm run build`
Expected: PASS on all four (lint may show the 18 pre-existing `react-hooks/set-state-in-effect` warnings in `useIssues.ts` — unrelated to this feature, 0 errors expected)

- [ ] **Step 2: ⚠️ Manual — enable `pg_cron`**

In the Supabase dashboard: Database → Extensions → enable `pg_cron`. This must happen before Step 4 below, or `cron.schedule(...)` in the Task 4 migration will fail.

- [ ] **Step 3: ⚠️ Manual — verify the `issues` RLS assumption (Task 3)**

In the Supabase SQL editor, run:

```sql
select policyname, cmd, qual, with_check from pg_policies where tablename = 'issues';
```

Confirm the existing policies match "read open to authenticated, write/delete restricted to `auth.uid() = created_by`" as assumed in Task 3. If not, edit `supabase/migrations/20260929030000_harden_rls_for_deleted_accounts.sql` accordingly before the next step.

- [ ] **Step 4: ⚠️ Manual — push the migrations**

This touches the live/shared Supabase project — run it yourself, not as an unattended step:

```bash
supabase db push
```

- [ ] **Step 5: ⚠️ Manual — smoke test against the real project**

Following the same method already used for SEC-10/SEC-11 (`MANUEL_MISE_A_JOUR.md` §5, `CAHIER_DE_RECETTES.md`): with a real test account,
1. Delete the account from `Settings.tsx` → confirm immediate redirect to `/login` and the toast.
2. Try to log back in → confirm the `AccountDeletionGate` screen appears instead of the app, with the correct dates.
3. Click "Restaurer mon compte" → confirm normal app access returns and a previously-posted comment's author name is restored.
4. Repeat the deletion, and directly probe the REST API with the deleted account's still-valid token (e.g. attempt to POST a comment) → confirm it's rejected (RLS).

-- Révocation d'un signalement par la mairie de sa ville (soft : la ligne reste, avec
-- qui/quand/pourquoi). Pas de réactivation à ce stade. Le statut `status` n'est pas
-- touché : la révocation est portée par des colonnes dédiées.
alter table public.issues
  add column revoked_at timestamptz,
  add column revoked_by uuid references auth.users(id) on delete set null,
  add column revoked_reason text check (revoked_reason is null or char_length(revoked_reason) between 1 and 500);

-- La ville d'un compte mairie est stockée comme label complet ("Castelnau-le-Lez, Occitanie") ;
-- issues.city ne porte que le nom de commune (cf. getCityName côté client).
create function public.is_municipal_of_city(p_city text)
returns boolean
language sql
stable
as $$
  select p_city is not null and exists (
    select 1 from public.users
    where id = auth.uid() and role = 'municipal' and deleted_at is null
      and trim(split_part(city, ',', 1)) = p_city
  );
$$;

-- Un signalement révoqué n'est lisible que par son auteur et la mairie de sa ville.
drop policy "Authenticated users can read issues" on public.issues;
create policy "Authenticated users can read issues"
  on public.issues for select
  to authenticated
  using (revoked_at is null or created_by = auth.uid() or public.is_municipal_of_city(city));

-- Seul chemin d'écriture de la révocation : la policy UPDATE existante ne donne rien à la mairie.
create function public.revoke_issue(p_issue_id text, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := trim(coalesce(p_reason, ''));
  v_updated int;
begin
  if char_length(v_reason) not between 1 and 500 then
    raise exception 'Le motif de révocation est obligatoire (500 caractères max)';
  end if;

  update public.issues
  set revoked_at = now(), revoked_by = auth.uid(), revoked_reason = v_reason
  where id = p_issue_id
    and revoked_at is null
    and public.is_municipal_of_city(city);

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'Révocation refusée : signalement introuvable, déjà révoqué ou hors de votre ville';
  end if;
end;
$$;

revoke all on function public.revoke_issue(text, text) from public, anon;
grant execute on function public.revoke_issue(text, text) to authenticated;

-- Hors compte mairie : impossible de poser/retirer la révocation ni de modifier un
-- signalement déjà révoqué (la policy UPDATE du propriétaire autorise toutes les colonnes).
create function public.guard_issue_revocation()
returns trigger
language plpgsql
as $$
begin
  if not public.is_municipal_account() then
    if old.revoked_at is not null then
      raise exception 'Signalement révoqué : modification interdite';
    end if;
    if new.revoked_at is not null or new.revoked_by is not null or new.revoked_reason is not null then
      raise exception 'Seule la mairie peut révoquer un signalement';
    end if;
  end if;
  return new;
end;
$$;

create trigger issues_guard_revocation
  before update on public.issues
  for each row execute function public.guard_issue_revocation();

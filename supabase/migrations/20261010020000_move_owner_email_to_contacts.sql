-- L'e-mail du propriétaire d'un lieu privé est une donnée de tiers : il était lisible par tous
-- les comptes connectés (colonne de `issues`, dont la lecture est ouverte). Il passe dans une
-- table à part, lisible uniquement par l'auteur du signalement et par la mairie de sa commune.
--
-- ⚠️ Pousser cette migration puis déployer le front aussitôt : l'ancien front écrit encore
-- `issues.owner_email`, colonne supprimée ici (la création d'un signalement échoue entre les deux).
create table public.issue_owner_contacts (
  issue_id text primary key references public.issues(id) on delete cascade,
  owner_email text not null check (char_length(owner_email) between 3 and 254)
);

alter table public.issue_owner_contacts enable row level security;

-- La sous-requête sur `issues` passe par sa propre RLS (auteur, ou mairie pour un révoqué).
create policy "Author and city hall can read the owner contact"
  on public.issue_owner_contacts for select
  to authenticated
  using (
    exists (
      select 1 from public.issues i
      where i.id = issue_id
        and (i.created_by = auth.uid() or public.is_municipal_of_insee(i.city_insee))
    )
  );

create policy "Active authors can add the owner contact"
  on public.issue_owner_contacts for insert
  to authenticated
  with check (
    public.is_active_account()
    and exists (select 1 from public.issues i where i.id = issue_id and i.created_by = auth.uid())
  );

create policy "Active authors can update the owner contact"
  on public.issue_owner_contacts for update
  to authenticated
  using (exists (select 1 from public.issues i where i.id = issue_id and i.created_by = auth.uid()))
  with check (
    public.is_active_account()
    and exists (select 1 from public.issues i where i.id = issue_id and i.created_by = auth.uid())
  );

create policy "Active authors can delete the owner contact"
  on public.issue_owner_contacts for delete
  to authenticated
  using (
    public.is_active_account()
    and exists (select 1 from public.issues i where i.id = issue_id and i.created_by = auth.uid())
  );

insert into public.issue_owner_contacts (issue_id, owner_email)
select id, trim(owner_email)
from public.issues
where owner_email is not null
  and char_length(trim(owner_email)) between 3 and 254
on conflict do nothing;

alter table public.issues drop column owner_email;

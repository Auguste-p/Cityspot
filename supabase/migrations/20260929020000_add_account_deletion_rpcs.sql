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

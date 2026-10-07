-- Mail à l'auteur lors d'une révocation (Edge Function `notify-revocation`, via Resend).
-- `revocation_notified_at` empêche tout renvoi ; il n'est écrit que par la fonction (clé service).
alter table public.issues add column revocation_notified_at timestamptz;

-- Le trigger de garde doit laisser passer la clé service (auth.uid() null : la Edge Function
-- marque la notification sur un signalement déjà révoqué). Les rôles anon/authenticated
-- ont toujours un auth.uid() non nul quand RLS les laisse écrire.
create or replace function public.guard_issue_revocation()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if not public.is_municipal_account() then
    if old.revoked_at is not null then
      raise exception 'Signalement révoqué : modification interdite';
    end if;
    if new.revoked_at is not null or new.revoked_by is not null or new.revoked_reason is not null
       or new.revocation_notified_at is distinct from old.revocation_notified_at then
      raise exception 'Seule la mairie peut révoquer un signalement';
    end if;
  end if;
  return new;
end;
$$;

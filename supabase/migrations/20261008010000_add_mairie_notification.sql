-- Mail aux comptes mairie de la ville quand un signalement exige autorisation et matériel
-- spécifique (Edge Function `notify-mairie`). `mairie_notified_at` garantit un seul envoi
-- par signalement ; il n'est écrit que par la fonction (clé service).
alter table public.issues add column mairie_notified_at timestamptz;

-- Le trigger de garde interdit aussi à tout compte non service de toucher cette colonne :
-- sinon l'auteur pourrait la remettre à NULL et relancer des mails à la mairie en boucle.
create or replace function public.guard_issue_revocation()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.mairie_notified_at is distinct from old.mairie_notified_at then
    raise exception 'mairie_notified_at est géré par le serveur';
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

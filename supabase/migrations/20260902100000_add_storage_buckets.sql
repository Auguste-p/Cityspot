-- Remplace le stockage base64 en base (issues.image_url) par de vrais fichiers
-- dans Supabase Storage. Deux buckets publics en lecture (comme les issues,
-- lecture ouverte / écriture réservée au propriétaire) :
-- - issue-photos : photo d'un signalement
-- - avatars      : photo de profil
-- Chemin de chaque fichier : {auth.uid()}/{timestamp}.{ext} — les policies
-- d'écriture vérifient que le premier segment du chemin est bien l'appelant.

insert into storage.buckets (id, name, public)
values ('issue-photos', 'issue-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Public read access to issue photos"
  on storage.objects for select
  using (bucket_id = 'issue-photos');

create policy "Users can upload their own issue photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'issue-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own issue photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'issue-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own issue photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'issue-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Public read access to avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

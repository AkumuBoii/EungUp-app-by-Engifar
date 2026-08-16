begin;
  -- Allow signed-in users to view any avatar in the private bucket
  create policy "Avatar reads" on storage.objects for select to authenticated using (bucket_id = 'avatars');

  -- Allow signed-in users to upload only inside their own user-id folder
  create policy "Avatar uploads" on storage.objects for insert to authenticated
    with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

  -- Allow users to update or delete only their own avatar files
  create policy "Avatar updates" on storage.objects for update to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
  create policy "Avatar deletes" on storage.objects for delete to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
commit;
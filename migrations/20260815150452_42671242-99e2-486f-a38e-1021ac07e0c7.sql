-- daily_stats
drop policy if exists "read daily stats" on public.daily_stats;
create policy "own daily stats" on public.daily_stats for select to authenticated using (auth.uid() = user_id);

-- streaks
drop policy if exists "read streaks" on public.streaks;
create policy "own streaks" on public.streaks for select to authenticated using (auth.uid() = user_id);

-- user_memes
drop policy if exists "collections readable" on public.user_memes;
create policy "own collection" on public.user_memes for select to authenticated using (auth.uid() = user_id);

-- profiles
drop policy if exists "profiles readable by signed in users" on public.profiles;
create policy "own profile readable" on public.profiles for select to authenticated using (auth.uid() = id);

-- storage avatars: owner-only reads
drop policy if exists "Avatar reads" on storage.objects;
create policy "Avatar reads" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- security definer helpers should not be callable directly
revoke execute on function public.has_role(uuid, public.app_role) from anon, authenticated, public;
revoke execute on function public.is_class_member(uuid, uuid) from anon, authenticated, public;
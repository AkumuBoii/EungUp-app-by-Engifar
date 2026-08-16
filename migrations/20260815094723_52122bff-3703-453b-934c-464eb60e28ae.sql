drop function if exists public.handle_new_user();
revoke all on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
revoke all on function public.is_group_member(uuid, uuid) from public, anon, authenticated;
revoke all on function public.update_updated_at_column() from public, anon, authenticated;
grant execute on function public.has_role(uuid, public.app_role) to service_role;
grant execute on function public.is_group_member(uuid, uuid) to service_role;
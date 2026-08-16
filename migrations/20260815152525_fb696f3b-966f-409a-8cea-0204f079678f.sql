GRANT EXECUTE ON FUNCTION public.is_class_member(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_class_member(uuid, uuid) FROM anon, public;
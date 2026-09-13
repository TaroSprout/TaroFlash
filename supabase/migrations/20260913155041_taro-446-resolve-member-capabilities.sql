-- knowledge: resolve_member_capabilities — corpus/authz/capabilities.md

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.resolve_member_capabilities()
 RETURNS TABLE(key text, live boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select c.key, public.capability_is_live(c.key) as live
  from public.capabilities c
$function$
;

revoke all on function public.resolve_member_capabilities() from public;
revoke all on function public.resolve_member_capabilities() from anon;
grant all on function public.resolve_member_capabilities() to authenticated;
grant all on function public.resolve_member_capabilities() to service_role;

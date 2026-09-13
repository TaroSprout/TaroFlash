-- knowledge: list_capability_grants — corpus/authz/capabilities.md

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.list_capability_grants(p_key text)
 RETURNS TABLE(id uuid, display_name text, avatar_url text, granted_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select m.id, m.display_name, m.avatar_url, g.granted_at
  from public.capability_grants g
  join public.members m on m.id = g.member_id
  where g.key = p_key
    and public.can_manage_capabilities()
  order by g.granted_at asc, m.display_name asc
$function$
;

revoke all on function public.list_capability_grants(p_key text) from public;
revoke all on function public.list_capability_grants(p_key text) from anon;
grant all on function public.list_capability_grants(p_key text) to authenticated;
grant all on function public.list_capability_grants(p_key text) to service_role;



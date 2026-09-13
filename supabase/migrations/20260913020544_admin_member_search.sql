set check_function_bodies = off;

create type "public"."member_search_result" as ("id" uuid, "display_name" text, "avatar_url" text, "email" text);

CREATE OR REPLACE FUNCTION public.search_members(p_query text)
 RETURNS SETOF public.member_search_result
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT m.id, m.display_name, m.avatar_url, m.email
  FROM public.members m
  WHERE public.can_manage_members()
    AND length(trim(p_query)) >= 2 -- below two characters the match is too broad to be useful.
    AND m.delete_at IS NULL -- a pending-deletion account is hidden from everyone, admins included.
    -- strpos on lowered text is a case-insensitive substring test that treats the query as literal, so `%` or `_` in it can't act as a wildcard.
    AND (
      strpos(lower(m.display_name), lower(trim(p_query))) > 0
      OR strpos(lower(coalesce(m.email, '')), lower(trim(p_query))) > 0
    )
  ORDER BY m.display_name
  LIMIT 20;
$function$
;

-- Hand-written: `db diff` emits no function grants, so a SECURITY DEFINER function otherwise lands executable by anon; lock it to authenticated.
REVOKE ALL ON FUNCTION public.search_members(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_members(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.search_members(text) TO authenticated;


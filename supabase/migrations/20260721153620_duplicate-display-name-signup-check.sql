alter table "public"."members" drop constraint "members_display_name_key";

drop index if exists "public"."members_display_name_key";

CREATE UNIQUE INDEX members_display_name_key ON public.members USING btree (lower(display_name));

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.is_display_name_available(candidate text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select not exists (
    select 1 from public.members
    where lower(display_name) = lower(trim(candidate))
  );
$function$
;



grant execute on function public.is_display_name_available(text) to anon;
grant execute on function public.is_display_name_available(text) to authenticated;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.member_has_password()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from auth.users
    where id = (select auth.uid())
      and encrypted_password is not null
      and encrypted_password <> ''
  );
$function$
;

-- Hand-written: db diff emits no function grants, so a new definer function
-- lands executable by anon without these.
revoke all on function public.member_has_password() from public;
revoke all on function public.member_has_password() from anon;
grant execute on function public.member_has_password() to authenticated;


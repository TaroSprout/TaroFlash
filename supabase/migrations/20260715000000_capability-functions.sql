-- Capability functions: one SQL function per grant, not per role.
--
-- Mirrors the frontend's useCan() pattern (src/composables/can.ts) — name
-- capabilities by what they grant ("can_manage_members"), not by the role
-- that happens to have it today ("is_admin"). Each function combines
-- auth_role()/auth_plan() however the capability needs; callers never check
-- role/plan directly. When a policy changes, only the function body changes —
-- every call site (RLS policy, edge function) picks it up automatically.
--
-- Retrofits the two existing role-checks: the members admin-update policy,
-- and the audio-reader edge functions' admin gate.

create or replace function public.can_manage_members()
returns boolean
language sql
stable
set search_path = public
as $$
  select auth_role() = 'admin'
$$;

create or replace function public.can_read_lesson_audio()
returns boolean
language sql
stable
set search_path = public
as $$
  select auth_role() = 'admin'
$$;

-- Supabase grants EXECUTE on new public functions to anon + authenticated by
-- default (via ALTER DEFAULT PRIVILEGES) — REVOKE FROM public alone leaves
-- those in place, so name each role explicitly. Only authenticated members
-- should be able to check a capability at all.
revoke all on function public.can_manage_members() from public, anon, authenticated;
revoke all on function public.can_read_lesson_audio() from public, anon, authenticated;
grant execute on function public.can_manage_members() to authenticated;
grant execute on function public.can_read_lesson_audio() to authenticated;

drop policy if exists "admins can update any member" on public.members;

create policy "admins can update any member"
on public.members
for update
to authenticated
using (can_manage_members())
with check (can_manage_members());

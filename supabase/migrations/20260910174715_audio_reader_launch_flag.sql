-- knowledge: can_read_lesson_audio — corpus/authz/capabilities.md
--
-- Move the audio reader behind the audio_reader capability.

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.can_read_lesson_audio()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select capability_is_live('audio_reader') and auth_role() = 'admin'
$function$
;

-- Seed audio_reader off; DML isn't emitted by db diff so it's hand-written.
insert into public.capabilities (key, state)
values ('audio_reader', 'off')
on conflict (key) do nothing;

-- knowledge: can_read_lesson_audio, capability_is_live — corpus/authz/capabilities.md
--
-- Migrate the audio reader onto the audio_reader capability. The RPC now
-- composes capability_is_live('audio_reader') with the existing admin check, so
-- all four audio edge functions (transcribe-lesson, translate-term,
-- translate-transcript, transliterate-transcript) go dark until the capability is
-- flipped on — they share this one RPC.

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

-- Seed the audio_reader capability at its baseline: off. The seeded state IS the
-- baseline — there is no separate default column — so this row is what reads
-- until an admin flips it. DML isn't emitted by db diff, so it's hand-written
-- here. ON CONFLICT DO NOTHING keeps it idempotent and never stomps a state an
-- admin has already set in an environment where the row exists.
insert into public.capabilities (key, state)
values ('audio_reader', 'off')
on conflict (key) do nothing;

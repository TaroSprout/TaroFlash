-- knowledge: lesson_sentences, set_lesson_break_strengths — unrecorded

alter table "public"."lesson_sentences" add column "break_strength" double precision;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.set_lesson_break_strengths(p_lesson_id bigint, p_strengths jsonb)
 RETURNS void
 LANGUAGE sql
AS $function$
  update public.lesson_sentences ls
     set break_strength = s.strength
    from jsonb_to_recordset(p_strengths) as s(ordinal integer, strength double precision)
   where ls.lesson_id = p_lesson_id and ls.ordinal = s.ordinal;
$function$
;

-- Grants aren't emitted by db diff; only the service-role worker writes sentence
-- rows, matching the other set_lesson_* functions.
REVOKE ALL ON FUNCTION public.set_lesson_break_strengths(p_lesson_id bigint, p_strengths jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_lesson_break_strengths(p_lesson_id bigint, p_strengths jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.set_lesson_break_strengths(p_lesson_id bigint, p_strengths jsonb) FROM authenticated;
GRANT ALL ON FUNCTION public.set_lesson_break_strengths(p_lesson_id bigint, p_strengths jsonb) TO service_role;


-- knowledge: lessons — corpus/media/audio-generation.md
-- knowledge: lesson_sentences, upsert_lesson_sentences, set_lesson_chapters, set_lesson_translations, set_lesson_readings — unrecorded
-- knowledge: create_pending_lesson, lesson_collections_with_counts — unrecorded

drop view if exists "public"."lesson_collections_with_counts";


  create table "public"."lesson_sentences" (
    "lesson_id" bigint not null,
    "ordinal" integer not null,
    "start_seconds" double precision not null,
    "end_seconds" double precision not null,
    "text" text not null,
    "words" jsonb not null default '[]'::jsonb,
    "paragraph_gap" double precision not null default 0,
    "translation" text,
    "readings" jsonb,
    "chapter_title" text
      );


alter table "public"."lesson_sentences" enable row level security;

alter table "public"."lessons" drop column "transcript";

CREATE UNIQUE INDEX lesson_sentences_pkey ON public.lesson_sentences USING btree (lesson_id, ordinal);

alter table "public"."lesson_sentences" add constraint "lesson_sentences_pkey" PRIMARY KEY using index "lesson_sentences_pkey";

alter table "public"."lesson_sentences" add constraint "lesson_sentences_lesson_id_fkey" FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE not valid;

alter table "public"."lesson_sentences" validate constraint "lesson_sentences_lesson_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.set_lesson_chapters(p_lesson_id bigint, p_chapters jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  update public.lesson_sentences
     set chapter_title = null
   where lesson_id = p_lesson_id and chapter_title is not null;

  update public.lesson_sentences ls
     set chapter_title = c.title
    from jsonb_to_recordset(p_chapters) as c(ordinal integer, title text)
   where ls.lesson_id = p_lesson_id and ls.ordinal = c.ordinal;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_lesson_readings(p_lesson_id bigint, p_readings jsonb)
 RETURNS void
 LANGUAGE sql
AS $function$
  update public.lesson_sentences ls
     set readings = r.readings
    from jsonb_to_recordset(p_readings) as r(ordinal integer, readings jsonb)
   where ls.lesson_id = p_lesson_id and ls.ordinal = r.ordinal;
$function$
;

CREATE OR REPLACE FUNCTION public.set_lesson_translations(p_lesson_id bigint, p_translations jsonb)
 RETURNS void
 LANGUAGE sql
AS $function$
  update public.lesson_sentences ls
     set translation = t.translation
    from jsonb_to_recordset(p_translations) as t(ordinal integer, translation text)
   where ls.lesson_id = p_lesson_id and ls.ordinal = t.ordinal;
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_lesson_sentences(p_lesson_id bigint, p_sentences jsonb)
 RETURNS void
 LANGUAGE sql
AS $function$
  insert into public.lesson_sentences
    (lesson_id, ordinal, start_seconds, end_seconds, text, words, paragraph_gap)
  select
    p_lesson_id, s.ordinal, s.start_seconds, s.end_seconds, s.text, s.words, s.paragraph_gap
  from jsonb_to_recordset(p_sentences) as s(
    ordinal integer, start_seconds double precision, end_seconds double precision,
    text text, words jsonb, paragraph_gap double precision
  )
  on conflict (lesson_id, ordinal) do update set
    start_seconds = excluded.start_seconds,
    end_seconds   = excluded.end_seconds,
    text          = excluded.text,
    words         = excluded.words,
    paragraph_gap = excluded.paragraph_gap;
$function$
;

CREATE OR REPLACE FUNCTION public.create_pending_lesson(p_collection_id bigint, p_title text, p_audio_path text, p_script text DEFAULT 'original'::text, p_chunks jsonb DEFAULT '[]'::jsonb)
 RETURNS public.lessons
 LANGUAGE plpgsql
AS $function$
declare
  v_lesson public.lessons;
  v_position numeric;
  v_chunks jsonb;
begin
  -- Server-assigned chapter order within the collection (max + 1), same as cards.
  select coalesce(max("position"), 0) + 1
  into v_position
  from public.lessons
  where collection_id = p_collection_id;

  -- Empty manifest -> one chunk covering the whole file from offset 0.
  if p_chunks is null or jsonb_array_length(p_chunks) = 0 then
    v_chunks := jsonb_build_array(
      jsonb_build_object('path', p_audio_path, 'offset', 0)
    );
  else
    v_chunks := p_chunks;
  end if;

  insert into public.lessons
    (collection_id, title, audio_path,
     status, phase, script, "position", chunks, chunk_cursor)
  values
    (p_collection_id, p_title, p_audio_path,
     'processing', 'transcribing', p_script, v_position, v_chunks, 0)
  returning * into v_lesson;

  insert into public.media (bucket, path, lesson_id)
  values ('audio-lessons', p_audio_path, v_lesson.id);

  return v_lesson;
end;
$function$
;

create or replace view "public"."lesson_collections_with_counts" with (security_invoker='true') as  SELECT lc.id,
    lc.member_id,
    lc.title,
    lc.last_lesson_id,
    lc.last_position_seconds,
    lc.created_at,
    lc.updated_at,
    ( SELECT (count(*))::integer AS count
           FROM public.lessons l
          WHERE (l.collection_id = lc.id)) AS lesson_count
   FROM public.lesson_collections lc;


grant delete on table "public"."lesson_sentences" to "anon";

grant insert on table "public"."lesson_sentences" to "anon";

grant references on table "public"."lesson_sentences" to "anon";

grant select on table "public"."lesson_sentences" to "anon";

grant trigger on table "public"."lesson_sentences" to "anon";

grant truncate on table "public"."lesson_sentences" to "anon";

grant update on table "public"."lesson_sentences" to "anon";

grant delete on table "public"."lesson_sentences" to "authenticated";

grant insert on table "public"."lesson_sentences" to "authenticated";

grant references on table "public"."lesson_sentences" to "authenticated";

grant select on table "public"."lesson_sentences" to "authenticated";

grant trigger on table "public"."lesson_sentences" to "authenticated";

grant truncate on table "public"."lesson_sentences" to "authenticated";

grant update on table "public"."lesson_sentences" to "authenticated";

grant delete on table "public"."lesson_sentences" to "service_role";

grant insert on table "public"."lesson_sentences" to "service_role";

grant references on table "public"."lesson_sentences" to "service_role";

grant select on table "public"."lesson_sentences" to "service_role";

grant trigger on table "public"."lesson_sentences" to "service_role";

grant truncate on table "public"."lesson_sentences" to "service_role";

grant update on table "public"."lesson_sentences" to "service_role";


  create policy "lesson_sentences_owner_select"
  on "public"."lesson_sentences"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.lessons l
  WHERE ((l.id = lesson_sentences.lesson_id) AND (l.member_id = ( SELECT public.active_member_id() AS active_member_id))))));


-- db diff never emits function grants, so lock the sentence-writing RPCs to the
-- service-role worker by hand — a member reaches sentence rows through the view's
-- SELECT policy only, never these writers.
revoke all on function public.upsert_lesson_sentences(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.upsert_lesson_sentences(bigint, jsonb) to service_role;

revoke all on function public.set_lesson_chapters(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.set_lesson_chapters(bigint, jsonb) to service_role;

revoke all on function public.set_lesson_translations(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.set_lesson_translations(bigint, jsonb) to service_role;

revoke all on function public.set_lesson_readings(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.set_lesson_readings(bigint, jsonb) to service_role;




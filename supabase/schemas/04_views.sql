-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE VIEW public.cards_with_images WITH (security_invoker='true') AS
 SELECT c.id,
    c.created_at,
    c.updated_at,
    c.front_text,
    c.back_text,
    c.deck_id,
    c.member_id,
    c.rank,
    front.bucket AS front_image_bucket,
    front.path AS front_image_path,
    back.bucket AS back_image_bucket,
    back.path AS back_image_path,
    ((c.front_text <> ''::text) AND (c.back_text <> ''::text) AND (count(*) OVER (PARTITION BY c.deck_id, c.front_text, c.back_text) > 1)) AS is_duplicate
   FROM ((public.cards c
     LEFT JOIN public.media front ON (((front.card_id = c.id) AND (front.slot = 'card_front'::public.media_slot) AND (front.deleted_at IS NULL))))
     LEFT JOIN public.media back ON (((back.card_id = c.id) AND (back.slot = 'card_back'::public.media_slot) AND (back.deleted_at IS NULL))));


ALTER TABLE public.cards_with_images OWNER TO postgres;


CREATE VIEW public.lesson_collections_with_counts WITH (security_invoker='true') AS
 SELECT lc.id,
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


ALTER TABLE public.lesson_collections_with_counts OWNER TO postgres;


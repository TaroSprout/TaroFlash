-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


GRANT ALL ON TABLE public.cards TO anon;
GRANT ALL ON TABLE public.cards TO authenticated;
GRANT ALL ON TABLE public.cards TO service_role;


GRANT ALL ON TABLE public.lessons TO anon;
GRANT ALL ON TABLE public.lessons TO authenticated;
GRANT ALL ON TABLE public.lessons TO service_role;


GRANT ALL ON TABLE public.media TO anon;
GRANT ALL ON TABLE public.media TO authenticated;
GRANT ALL ON TABLE public.media TO service_role;


GRANT ALL ON TABLE public.cards_with_images TO anon;
GRANT ALL ON TABLE public.cards_with_images TO authenticated;
GRANT ALL ON TABLE public.cards_with_images TO service_role;


GRANT ALL ON TABLE public.feedback_items TO anon;
GRANT ALL ON TABLE public.feedback_items TO authenticated;
GRANT ALL ON TABLE public.feedback_items TO service_role;


GRANT ALL ON SEQUENCE public."Cards_id_seq" TO anon;
GRANT ALL ON SEQUENCE public."Cards_id_seq" TO authenticated;
GRANT ALL ON SEQUENCE public."Cards_id_seq" TO service_role;


GRANT ALL ON TABLE public.decks TO anon;
GRANT ALL ON TABLE public.decks TO authenticated;
GRANT ALL ON TABLE public.decks TO service_role;


GRANT ALL ON SEQUENCE public."Decks_id_seq" TO anon;
GRANT ALL ON SEQUENCE public."Decks_id_seq" TO authenticated;
GRANT ALL ON SEQUENCE public."Decks_id_seq" TO service_role;


GRANT ALL ON TABLE public.deck_review_pacing TO anon;
GRANT ALL ON TABLE public.deck_review_pacing TO authenticated;
GRANT ALL ON TABLE public.deck_review_pacing TO service_role;


GRANT ALL ON SEQUENCE public.feedback_items_id_seq TO anon;
GRANT ALL ON SEQUENCE public.feedback_items_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.feedback_items_id_seq TO service_role;


GRANT ALL ON TABLE public.feedback_votes TO anon;
GRANT ALL ON TABLE public.feedback_votes TO authenticated;
GRANT ALL ON TABLE public.feedback_votes TO service_role;


GRANT ALL ON TABLE public.shop_items TO anon;
GRANT ALL ON TABLE public.shop_items TO authenticated;
GRANT ALL ON TABLE public.shop_items TO service_role;


GRANT ALL ON SEQUENCE public.items_id_seq TO anon;
GRANT ALL ON SEQUENCE public.items_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.items_id_seq TO service_role;


GRANT ALL ON TABLE public.lesson_collections TO anon;
GRANT ALL ON TABLE public.lesson_collections TO authenticated;
GRANT ALL ON TABLE public.lesson_collections TO service_role;


GRANT ALL ON SEQUENCE public.lesson_collections_id_seq TO anon;
GRANT ALL ON SEQUENCE public.lesson_collections_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.lesson_collections_id_seq TO service_role;


GRANT ALL ON TABLE public.lesson_collections_with_counts TO anon;
GRANT ALL ON TABLE public.lesson_collections_with_counts TO authenticated;
GRANT ALL ON TABLE public.lesson_collections_with_counts TO service_role;


GRANT ALL ON SEQUENCE public.lessons_id_seq TO anon;
GRANT ALL ON SEQUENCE public.lessons_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.lessons_id_seq TO service_role;


GRANT ALL ON SEQUENCE public.media_id_seq TO anon;
GRANT ALL ON SEQUENCE public.media_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.media_id_seq TO service_role;


GRANT ALL ON TABLE public.members TO anon;
GRANT ALL ON TABLE public.members TO authenticated;
GRANT ALL ON TABLE public.members TO service_role;


GRANT ALL ON TABLE public.plans TO anon;
GRANT ALL ON TABLE public.plans TO authenticated;
GRANT ALL ON TABLE public.plans TO service_role;


GRANT ALL ON TABLE public.purchases TO anon;
GRANT ALL ON TABLE public.purchases TO authenticated;
GRANT ALL ON TABLE public.purchases TO service_role;


GRANT ALL ON SEQUENCE public.purchases_id_seq TO anon;
GRANT ALL ON SEQUENCE public.purchases_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.purchases_id_seq TO service_role;


GRANT ALL ON TABLE public.review_logs TO anon;
GRANT ALL ON TABLE public.review_logs TO authenticated;
GRANT ALL ON TABLE public.review_logs TO service_role;


GRANT ALL ON SEQUENCE public.review_logs_id_seq TO anon;
GRANT ALL ON SEQUENCE public.review_logs_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.review_logs_id_seq TO service_role;


GRANT ALL ON TABLE public.review_pacing_presets TO anon;
GRANT ALL ON TABLE public.review_pacing_presets TO authenticated;
GRANT ALL ON TABLE public.review_pacing_presets TO service_role;


GRANT ALL ON SEQUENCE public.review_pacing_presets_id_seq TO anon;
GRANT ALL ON SEQUENCE public.review_pacing_presets_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.review_pacing_presets_id_seq TO service_role;


GRANT ALL ON TABLE public.reviews TO anon;
GRANT ALL ON TABLE public.reviews TO authenticated;
GRANT ALL ON TABLE public.reviews TO service_role;


GRANT ALL ON SEQUENCE public.reviews_id_seq TO anon;
GRANT ALL ON SEQUENCE public.reviews_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.reviews_id_seq TO service_role;


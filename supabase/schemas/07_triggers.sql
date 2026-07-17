-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE TRIGGER enforce_deck_limit_on_insert BEFORE INSERT ON public.decks FOR EACH ROW EXECUTE FUNCTION public.enforce_member_deck_limit();


CREATE TRIGGER lesson_processing_chain AFTER INSERT OR UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.trigger_lesson_processing();


CREATE TRIGGER set_member_id_on_card BEFORE INSERT ON public.cards FOR EACH ROW EXECUTE FUNCTION public.set_member_id();


CREATE TRIGGER set_member_id_on_deck BEFORE INSERT ON public.decks FOR EACH ROW EXECUTE FUNCTION public.set_member_id();


CREATE TRIGGER set_member_id_on_feedback_item BEFORE INSERT ON public.feedback_items FOR EACH ROW EXECUTE FUNCTION public.set_member_id();


CREATE TRIGGER set_member_id_on_feedback_vote BEFORE INSERT ON public.feedback_votes FOR EACH ROW EXECUTE FUNCTION public.set_member_id();


CREATE TRIGGER set_member_id_on_lesson BEFORE INSERT ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.set_member_id();


CREATE TRIGGER set_member_id_on_lesson_collection BEFORE INSERT ON public.lesson_collections FOR EACH ROW EXECUTE FUNCTION public.set_member_id();


CREATE TRIGGER set_member_id_on_media BEFORE INSERT ON public.media FOR EACH ROW EXECUTE FUNCTION public.set_member_id();


CREATE TRIGGER set_member_id_on_review BEFORE INSERT ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.set_member_id();


CREATE TRIGGER set_member_id_on_review_pacing_preset BEFORE INSERT ON public.review_pacing_presets FOR EACH ROW EXECUTE FUNCTION public.set_member_id();


CREATE TRIGGER set_rank_on_deck_insert BEFORE INSERT ON public.decks FOR EACH ROW EXECUTE FUNCTION public.set_deck_rank();


CREATE TRIGGER trg_card_delete_soft_delete_media BEFORE DELETE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.soft_delete_media_before_card_delete();


CREATE TRIGGER trg_deck_delete_soft_delete_media BEFORE DELETE ON public.decks FOR EACH ROW EXECUTE FUNCTION public.soft_delete_media_before_deck_delete();


CREATE TRIGGER trg_lesson_delete_soft_delete_media BEFORE DELETE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.soft_delete_media_before_lesson_delete();


CREATE TRIGGER trg_media_dedupe_slot BEFORE INSERT ON public.media FOR EACH ROW EXECUTE FUNCTION public.dedupe_media_slot_on_insert();


CREATE TRIGGER trg_member_delete_soft_delete_media BEFORE DELETE ON public.members FOR EACH ROW EXECUTE FUNCTION public.soft_delete_media_before_member_delete();


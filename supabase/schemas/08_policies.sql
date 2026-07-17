-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE POLICY "Enable delete for users based on user_id" ON public.cards FOR DELETE TO authenticated USING ((auth.uid() = member_id));


CREATE POLICY "Enable delete for users based on user_id" ON public.decks FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = member_id));


CREATE POLICY "Enable delete for users based on user_id" ON public.media FOR DELETE USING ((( SELECT auth.uid() AS uid) = member_id));


CREATE POLICY "Enable insert for authenticated users" ON public.members FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


CREATE POLICY "Enable insert for authenticated users only" ON public.cards FOR INSERT TO authenticated WITH CHECK ((auth.uid() = member_id));


CREATE POLICY "Enable insert for authenticated users only" ON public.decks FOR INSERT TO authenticated WITH CHECK ((auth.uid() = member_id));


CREATE POLICY "Enable insert for authenticated users only" ON public.media FOR INSERT TO authenticated WITH CHECK (((auth.uid() = member_id) AND ((NOT COALESCE((slot = ANY (ARRAY['card_front'::public.media_slot, 'card_back'::public.media_slot])), false)) OR (public.auth_plan() = 'paid'::text))));


CREATE POLICY "Enable insert for users based on user_id" ON public.purchases FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = member_id));


CREATE POLICY "Enable insert for users based on user_id" ON public.reviews FOR INSERT TO authenticated WITH CHECK (( SELECT (auth.uid() = reviews.member_id)));


CREATE POLICY "Enable read access for all users" ON public.members FOR SELECT USING (true);


CREATE POLICY "Enable read access for all users" ON public.shop_items FOR SELECT USING (true);


CREATE POLICY "Enable update for authenticated users" ON public.decks FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = member_id));


CREATE POLICY "Enable update for users with member_id" ON public.media FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = member_id));


CREATE POLICY "Enable users to view their own data only" ON public.purchases FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = member_id));


CREATE POLICY "Enable users to view their own data only" ON public.reviews FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = member_id));


CREATE POLICY "Members can insert their own review logs" ON public.review_logs FOR INSERT TO authenticated WITH CHECK ((auth.uid() = member_id));


CREATE POLICY "Members can view their own review logs" ON public.review_logs FOR SELECT TO authenticated USING ((auth.uid() = member_id));


CREATE POLICY "Read cards from public decks or own cards" ON public.cards FOR SELECT USING (((auth.uid() = member_id) OR (EXISTS ( SELECT 1
   FROM public.decks
  WHERE ((decks.id = cards.deck_id) AND (decks.is_public = true))))));


CREATE POLICY "Read own media or media in public decks" ON public.media FOR SELECT USING (((auth.uid() = member_id) OR (EXISTS ( SELECT 1
   FROM (public.cards c
     JOIN public.decks d ON ((d.id = c.deck_id)))
  WHERE ((c.id = media.card_id) AND (d.is_public = true)))) OR (EXISTS ( SELECT 1
   FROM public.decks d
  WHERE ((d.id = media.deck_id) AND (d.is_public = true))))));


CREATE POLICY "Read public decks or own decks" ON public.decks FOR SELECT USING (((is_public = true) OR (auth.uid() = member_id)));


CREATE POLICY "Users can update their own cards" ON public.cards FOR UPDATE TO authenticated USING ((auth.uid() = member_id)) WITH CHECK ((auth.uid() = member_id));


CREATE POLICY "admins can update any member" ON public.members FOR UPDATE TO authenticated USING (public.can_manage_members()) WITH CHECK (public.can_manage_members());


ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.deck_review_pacing ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.feedback_items ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.feedback_votes ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.lesson_collections ENABLE ROW LEVEL SECURITY;


CREATE POLICY lesson_collections_owner_delete ON public.lesson_collections FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = member_id));


CREATE POLICY lesson_collections_owner_insert ON public.lesson_collections FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = member_id));


CREATE POLICY lesson_collections_owner_select ON public.lesson_collections FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = member_id));


CREATE POLICY lesson_collections_owner_update ON public.lesson_collections FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = member_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = member_id));


ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;


CREATE POLICY lessons_owner_delete ON public.lessons FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = member_id));


CREATE POLICY lessons_owner_insert ON public.lessons FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = member_id));


CREATE POLICY lessons_owner_select ON public.lessons FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = member_id));


CREATE POLICY lessons_owner_update ON public.lessons FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = member_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = member_id));


ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;


CREATE POLICY "members can delete their own feedback vote" ON public.feedback_votes FOR DELETE TO authenticated USING ((member_id = auth.uid()));


CREATE POLICY "members can delete their own presets" ON public.review_pacing_presets FOR DELETE TO authenticated USING (((member_id = auth.uid()) AND (is_system = false)));


CREATE POLICY "members can insert their own feedback item" ON public.feedback_items FOR INSERT TO authenticated WITH CHECK ((member_id = auth.uid()));


CREATE POLICY "members can insert their own feedback vote" ON public.feedback_votes FOR INSERT TO authenticated WITH CHECK ((member_id = auth.uid()));


CREATE POLICY "members can insert their own presets" ON public.review_pacing_presets FOR INSERT TO authenticated WITH CHECK (((member_id = auth.uid()) AND (is_system = false)));


CREATE POLICY "members can read and write their own decks' pacing" ON public.deck_review_pacing TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.decks d
  WHERE ((d.id = deck_review_pacing.deck_id) AND (d.member_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.decks d
  WHERE ((d.id = deck_review_pacing.deck_id) AND (d.member_id = auth.uid())))));


CREATE POLICY "members can read feedback votes" ON public.feedback_votes FOR SELECT TO authenticated USING (true);


CREATE POLICY "members can read public feedback items" ON public.feedback_items FOR SELECT TO authenticated USING (((visibility = 'public'::public.feedback_visibility) OR public.can_moderate_feedback() OR (member_id = auth.uid())));


CREATE POLICY "members can read their own or the system preset" ON public.review_pacing_presets FOR SELECT TO authenticated USING ((is_system OR (member_id = auth.uid())));


CREATE POLICY "members can update their own non-privileged fields" ON public.members FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK (((auth.uid() = id) AND (role = ( SELECT members_1.role
   FROM public.members members_1
  WHERE (members_1.id = auth.uid()))) AND (plan = ( SELECT members_1.plan
   FROM public.members members_1
  WHERE (members_1.id = auth.uid()))) AND (NOT (stripe_customer_id IS DISTINCT FROM ( SELECT members_1.stripe_customer_id
   FROM public.members members_1
  WHERE (members_1.id = auth.uid())))) AND (NOT (stripe_subscription_id IS DISTINCT FROM ( SELECT members_1.stripe_subscription_id
   FROM public.members members_1
  WHERE (members_1.id = auth.uid()))))));


CREATE POLICY "members can update their own presets" ON public.review_pacing_presets FOR UPDATE TO authenticated USING (((member_id = auth.uid()) AND (is_system = false))) WITH CHECK (((member_id = auth.uid()) AND (is_system = false)));


CREATE POLICY "members can update their own purchases" ON public.purchases FOR UPDATE TO authenticated USING ((auth.uid() = member_id));


CREATE POLICY "members can update their own reviews" ON public.reviews FOR UPDATE TO authenticated USING ((auth.uid() = member_id));


CREATE POLICY "moderators can update feedback items" ON public.feedback_items FOR UPDATE TO authenticated USING (public.can_moderate_feedback()) WITH CHECK (public.can_moderate_feedback());


ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;


CREATE POLICY "plans readable by authenticated users" ON public.plans FOR SELECT TO authenticated USING ((is_active = true));


ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.review_logs ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.review_pacing_presets ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;


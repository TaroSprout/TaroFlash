-- Objects our migrations own in the auth/storage schemas (outside the public
-- dump): the signup trigger and per-bucket storage.objects RLS policies.
-- Storage BUCKETS are seed DML (insert into storage.buckets) — db diff cannot
-- track DML, so buckets stay in versioned migrations per the supabase rule.
SET check_function_bodies = false;

CREATE TRIGGER on_auth_user_created_member AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_member_on_new_user();


CREATE POLICY audio_lessons_authenticated_delete ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'audio-lessons'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

CREATE POLICY audio_lessons_authenticated_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'audio-lessons'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

CREATE POLICY audio_lessons_authenticated_select ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'audio-lessons'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

CREATE POLICY audio_lessons_authenticated_update ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'audio-lessons'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]))) WITH CHECK (((bucket_id = 'audio-lessons'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

CREATE POLICY member_images_authenticated_delete ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'member-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

CREATE POLICY member_images_authenticated_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'member-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

CREATE POLICY member_images_authenticated_select ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'member-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

CREATE POLICY member_images_authenticated_update ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'member-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]))) WITH CHECK (((bucket_id = 'member-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

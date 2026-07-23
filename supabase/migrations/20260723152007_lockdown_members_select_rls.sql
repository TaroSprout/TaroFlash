drop policy "Enable read access for all users" on "public"."members";

set check_function_bodies = off;

create type "public"."member_profile" as ("display_name" text, "description" text, "cover_config" jsonb);

CREATE OR REPLACE FUNCTION public.member_public_profile(p_member_id uuid)
 RETURNS SETOF public.member_profile
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT m.display_name, m.description, m.cover_config
  FROM public.members m
  WHERE m.id = p_member_id;
$function$
;

CREATE OR REPLACE FUNCTION public.feedback_items_with_votes()
 RETURNS TABLE(id bigint, created_at timestamp with time zone, member_id uuid, member_display_name text, member_avatar text, title text, body text, type public.feedback_type, status public.feedback_status, visibility public.feedback_visibility, vote_count integer, voted_by_me boolean)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT
    f.id,
    f.created_at,
    f.member_id,
    m.display_name AS member_display_name,
    m.cover_config->>'avatar' AS member_avatar,
    f.title,
    f.body,
    f.type,
    f.status,
    f.visibility,
    (SELECT count(*)::int FROM public.feedback_votes v WHERE v.feedback_id = f.id) AS vote_count,
    EXISTS (
      SELECT 1 FROM public.feedback_votes v
      WHERE v.feedback_id = f.id AND v.member_id = auth.uid()
    ) AS voted_by_me
  FROM public.feedback_items f
  LEFT JOIN LATERAL public.member_public_profile(f.member_id) m ON true
$function$
;

CREATE OR REPLACE FUNCTION public.get_member_decks(p_today_start timestamp with time zone)
 RETURNS SETOF public.member_deck
 LANGUAGE sql
 STABLE
AS $function$
  SELECT
    d.id,
    d.created_at,
    d.updated_at,
    d.description,
    d.is_public,
    d.title,
    d.member_id,
    m.display_name AS member_display_name,
    d.tags,
    d.has_image,
    d.study_config,
    d.cover_config,
    d.card_attributes,

    (
      SELECT count(*)::int
      FROM public.cards c
      WHERE c.deck_id = d.id
    ) AS card_count,

    stats.reviewed_today_count,
    stats.new_reviewed_today_count,

    -- new_take + review_take, matching get_study_session_cards exactly.
    -- COALESCE(cap - used, INT_MAX) treats a NULL cap as unbounded.
    GREATEST(
      0,
      LEAST(stats.new_available, stats.remaining_new, stats.remaining_total)
    )
    + GREATEST(
      0,
      LEAST(
        stats.review_available,
        stats.remaining_total
          - GREATEST(0, LEAST(stats.new_available, stats.remaining_new, stats.remaining_total))
      )
    ) AS due_count,

    d.rank,

    dp.review_pacing_preset_id,

    -- All seven resolved pacing fields come from the shared resolver — the
    -- override -> preset -> system ladder lives only in resolve_deck_pacing now.
    rp.desired_retention,
    rp.learning_steps,
    rp.relearning_steps,
    rp.max_reviews_per_day,
    rp.max_new_per_day,
    rp.leech_threshold,
    rp.max_interval,

    dp.overrides AS pacing_overrides

  FROM public.decks d
  LEFT JOIN LATERAL public.member_public_profile(d.member_id) m ON true
  LEFT JOIN public.deck_review_pacing dp ON dp.deck_id = d.id
  CROSS JOIN LATERAL public.resolve_deck_pacing(d.id) AS rp
  CROSS JOIN LATERAL (
    SELECT
      (
        SELECT count(DISTINCT rl.card_id)::int
        FROM public.review_logs rl
        JOIN public.cards c ON c.id = rl.card_id
        WHERE c.deck_id = d.id
          AND rl.review >= p_today_start
      ) AS reviewed_today_count,

      (
        SELECT count(DISTINCT rl.card_id)::int
        FROM public.review_logs rl
        JOIN public.cards c ON c.id = rl.card_id
        WHERE c.deck_id = d.id
          AND rl.state = 0
          AND rl.review >= p_today_start
      ) AS new_reviewed_today_count,

      -- Cards with no reviews row at all = brand-new.
      (
        SELECT count(*)::int
        FROM public.cards c
        LEFT JOIN public.reviews r ON r.card_id = c.id
        WHERE c.deck_id = d.id
          AND r.id IS NULL
      ) AS new_available,

      -- Cards with a reviews row whose due date has passed.
      (
        SELECT count(*)::int
        FROM public.cards c
        JOIN public.reviews r ON r.card_id = c.id
        WHERE c.deck_id = d.id
          AND r.due <= now()
      ) AS review_available,

      GREATEST(
        0,
        COALESCE(
          rp.max_reviews_per_day - (
            SELECT count(DISTINCT rl.card_id)::int
            FROM public.review_logs rl
            JOIN public.cards c ON c.id = rl.card_id
            WHERE c.deck_id = d.id
              AND rl.review >= p_today_start
          ),
          2147483647
        )
      ) AS remaining_total,

      GREATEST(
        0,
        COALESCE(
          rp.max_new_per_day - (
            SELECT count(DISTINCT rl.card_id)::int
            FROM public.review_logs rl
            JOIN public.cards c ON c.id = rl.card_id
            WHERE c.deck_id = d.id
              AND rl.state = 0
              AND rl.review >= p_today_start
          ),
          2147483647
        )
      ) AS remaining_new
  ) AS stats;
$function$
;


  create policy "members can read their own row"
  on "public"."members"
  as permissive
  for select
  to authenticated
using ((auth.uid() = id));




-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.get_member_decks(p_today_start timestamp with time zone) RETURNS SETOF public.member_deck
    LANGUAGE sql STABLE
    AS $$
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
    -- COALESCE(cap - used, INT_MAX) treats a NULL cap as unbounded. A locked
    -- deck reports 0 so it drops out of the review inbox and "study all due" —
    -- study is barred there too (get_study_session_cards returns nothing).
    CASE WHEN lock.deadline IS NOT NULL THEN 0 ELSE
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
      )
    END AS due_count,

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

    dp.overrides AS pacing_overrides,

    -- Locked flag + deletion date the dashboard renders. Both fall out of the
    -- one deck_lock_deadline read: non-NULL deadline ⇒ locked.
    (lock.deadline IS NOT NULL) AS is_locked,
    lock.deadline AS locked_delete_at

  FROM public.decks d
  LEFT JOIN LATERAL public.member_public_profile(d.member_id) m ON true
  LEFT JOIN public.deck_review_pacing dp ON dp.deck_id = d.id
  CROSS JOIN LATERAL public.resolve_deck_pacing(d.id) AS rp
  CROSS JOIN LATERAL (SELECT public.deck_lock_deadline(d.id) AS deadline) AS lock
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
$$;


ALTER FUNCTION public.get_member_decks(p_today_start timestamp with time zone) OWNER TO postgres;


GRANT ALL ON FUNCTION public.get_member_decks(p_today_start timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.get_member_decks(p_today_start timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.get_member_decks(p_today_start timestamp with time zone) TO service_role;

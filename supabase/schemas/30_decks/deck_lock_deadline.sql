-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

-- The single source of truth for "is this deck locked, and until when?".
--
-- Returns the owner's downgrade grace deadline when the deck is locked, else
-- NULL. A deck is locked precisely when its owner is on `free`, carries a
-- downgrade_delete_at, and sits beyond the plan's deck_limit by rank — i.e. at
-- least deck_limit of the owner's decks rank ahead of it. Nothing is stored per
-- deck: reorder a deck above the line and this flips to NULL on the next read,
-- with no lock-state write anywhere.
--
-- SECURITY INVOKER (the default): it reads `members`/`plans` under the caller's
-- RLS. A member reading their own dashboard sees their own member row, so their
-- own decks resolve correctly; a foreign caller can't read the owner's member
-- row, so the join yields nothing and the deck reads as unlocked — locked-ness
-- is a private, owner-only concern, never leaked across the RLS boundary.
CREATE FUNCTION public.deck_lock_deadline(p_deck_id bigint) RETURNS timestamp with time zone
    LANGUAGE sql STABLE
    AS $$
  SELECT m.downgrade_delete_at
  FROM public.decks d
  JOIN public.members m ON m.id = d.member_id
  JOIN public.plans p ON p.id = m.plan
  WHERE d.id = p_deck_id
    AND m.plan = 'free'
    AND m.downgrade_delete_at IS NOT NULL
    AND p.deck_limit IS NOT NULL
    AND (
      SELECT count(*)
      FROM public.decks d2
      WHERE d2.member_id = d.member_id
        AND d2.rank < d.rank
    ) >= p.deck_limit;
$$;


ALTER FUNCTION public.deck_lock_deadline(bigint) OWNER TO postgres;


GRANT ALL ON FUNCTION public.deck_lock_deadline(bigint) TO anon;
GRANT ALL ON FUNCTION public.deck_lock_deadline(bigint) TO authenticated;
GRANT ALL ON FUNCTION public.deck_lock_deadline(bigint) TO service_role;

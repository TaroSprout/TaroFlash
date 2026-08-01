-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

-- Daily sweep: hard-delete every deck still locked for a member whose downgrade
-- grace has run out. The free-downgrade analog of purge-accounts, but pure SQL —
-- there is no auth user or Stripe subscription to unwind, only decks — so it runs
-- straight from pg_cron with no edge function. See the cron migration.
--
-- Deliberately dull, matching purge-accounts: it only ever touches decks whose
-- owner is on `free`, carries a downgrade_delete_at already in the past, and that
-- rank beyond the plan's deck_limit — exactly the decks deck_lock_deadline() calls
-- locked. A member who resubscribed (deadline cleared) or reordered a deck above
-- the line is untouched.
--
-- Media reclaim is free: DELETE FROM decks fires trg_deck_delete_soft_delete_media
-- (and, via the cards cascade, trg_card_delete_soft_delete_media), which tombstone
-- the storage rows for the hourly cleanup-media reaper. No bespoke media handling
-- here.
--
-- SECURITY DEFINER so the cron owner (postgres) runs it regardless of RLS; the
-- EXECUTE lockdown in the cron migration is the whole security boundary, since
-- db diff emits no grants and this must never sit on the anon RPC surface.
CREATE FUNCTION public.purge_downgraded_decks() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.decks d
  USING public.members m, public.plans p
  WHERE d.member_id = m.id
    AND p.id = m.plan
    AND m.plan = 'free'
    AND m.downgrade_delete_at IS NOT NULL
    AND m.downgrade_delete_at <= now()
    AND p.deck_limit IS NOT NULL
    AND (
      SELECT count(*)
      FROM public.decks d2
      WHERE d2.member_id = d.member_id
        AND d2.rank < d.rank
    ) >= p.deck_limit;
END;
$$;


ALTER FUNCTION public.purge_downgraded_decks() OWNER TO postgres;


-- Lockdown lives in the cron migration (db diff emits no grants). Never anon.
REVOKE ALL ON FUNCTION public.purge_downgraded_decks() FROM PUBLIC;

-- =============================================================================
-- Cascade member (and all member-owned data) when an auth.users row is deleted
-- =============================================================================
--
-- `public.members` is the profile projection of an `auth.users` row (members.id
-- == auth.users.id, stamped by the on-signup trigger). That FK was NO ACTION,
-- so deleting an auth user was *blocked* by the member row — and nothing below
-- got cleaned up. Everything under `members` already cascades:
--
--   members ─(CASCADE)→ decks ─(CASCADE)→ cards ─(CASCADE)→ reviews / review_logs / media
--           ─(CASCADE)→ cards
--           ─(CASCADE)→ reviews / review_logs
--           ─(CASCADE)→ purchases
--
-- Making members.id → auth.users ON DELETE CASCADE wires the top of that chain:
-- deleting an auth user now erases the member and all their data in one shot
-- (account-deletion / GDPR erasure semantics). The media BEFORE DELETE trigger
-- still fires first to soft-delete storage rows for the cleanup-media cron.
-- =============================================================================

BEGIN;

-- An FK's ON DELETE action can't be altered in place — drop and re-add it.
-- Both actions in one ALTER TABLE so it's a single atomic change. The
-- constraint name is mixed-case, so it must stay double-quoted.
ALTER TABLE public.members
  DROP CONSTRAINT "Users_id_fkey",
  ADD  CONSTRAINT "Users_id_fkey"
       FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;

-- Drop the redundant direct decks → auth.users FK. decks.member_id already
-- references members(id) ON DELETE CASCADE (decks_member_id_fkey); this second
-- constraint on the same column only added a NO ACTION block on auth-user
-- deletion, duplicating the relationship that now cascades through members.
ALTER TABLE public.decks
  DROP CONSTRAINT decks_user_id_fkey;

COMMIT;

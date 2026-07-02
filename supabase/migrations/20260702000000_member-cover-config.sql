-- =============================================================================
-- members.cover_config: persisted member-card theme + pattern
-- =============================================================================
--
-- Mirrors decks.cover_config — nullable jsonb, no default. Existing rows read
-- back NULL and the frontend falls back to MEMBER_CARD_COVER_DEFAULTS, same
-- as it did for the client-only cover before this column existed. Kept
-- separate from members.preferences (private, behavioral) since cover is
-- visual identity that may need its own RLS/select boundary if member
-- profiles ever become viewable by others.
-- =============================================================================

BEGIN;

ALTER TABLE public.members
  ADD COLUMN cover_config jsonb;

COMMIT;

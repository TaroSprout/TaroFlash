-- =============================================================================
-- decks.cover_config was a plain nullable jsonb column with no default —
-- the FE always sets a random cover on create (buildNewDeckPayload →
-- randomCoverConfig()), but a deck inserted directly via SQL (seed data,
-- manual fixes) got no cover, so card-cover.vue fell back to a flat purple
-- background. Give it a real DB-level default and backfill existing rows.
-- =============================================================================

begin;

alter table public.decks
  alter column cover_config set default '{
    "theme": "blue-500",
    "theme_dark": "blue-650",
    "pattern": "diagonal-stripes",
    "icon": "symbol-spades"
  }'::jsonb;

update public.decks
set cover_config = default
where cover_config is null;

commit;

-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

-- The fully-resolved deck row returned by both get_member_decks (the read RPC)
-- and save_deck (the write RPC, which returns the deck it just wrote via
-- get_member_decks). Extracting the shape into one composite type keeps the two
-- signatures from drifting — add a column here and both functions pick it up.
CREATE TYPE public.member_deck AS (
    id                            bigint,
    created_at                    timestamp with time zone,
    updated_at                    timestamp with time zone,
    description                   text,
    is_public                     boolean,
    title                         text,
    member_id                     uuid,
    member_display_name           text,
    tags                          text[],
    has_image                     boolean,
    study_config                  jsonb,
    cover_config                  jsonb,
    card_attributes               jsonb,
    card_count                    integer,
    reviewed_today_count          integer,
    new_reviewed_today_count      integer,
    due_count                     integer,
    rank                          numeric,
    review_pacing_preset_id       bigint,
    desired_retention             integer,
    learning_steps                text[],
    relearning_steps              text[],
    desired_retention_override    integer,
    learning_steps_override       text[],
    relearning_steps_override     text[],
    max_reviews_per_day           integer,
    max_new_per_day               integer,
    has_max_reviews_override      boolean,
    max_reviews_per_day_override  integer,
    has_max_new_override          boolean,
    max_new_per_day_override      integer,
    leech_threshold               integer,
    max_interval                  integer,
    leech_threshold_override      integer,
    has_max_interval_override     boolean,
    max_interval_override         integer
);


ALTER TYPE public.member_deck OWNER TO postgres;

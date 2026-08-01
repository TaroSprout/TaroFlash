-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

-- The two write-payloads save_review takes, extracted so an alternate save path
-- (e.g. a batch import) can accept the same shape instead of re-declaring every
-- column. Split in two because the FSRS *current state* (→ reviews) and the
-- *review event* (→ review_logs) share column names (due, stability, state,
-- scheduled_days, …) — one flat type would need log_* prefixes to disambiguate.
CREATE TYPE public.review_card_state AS (
    due            timestamp with time zone,
    stability      real,
    difficulty     real,
    elapsed_days   smallint,
    scheduled_days smallint,
    reps           smallint,
    lapses         smallint,
    last_review    timestamp with time zone,
    state          smallint,
    learning_steps smallint
);

CREATE TYPE public.review_log_entry AS (
    rating         smallint,
    state          smallint,
    due            timestamp with time zone,
    stability      real,
    difficulty     real,
    scheduled_days smallint,
    review         timestamp with time zone
);

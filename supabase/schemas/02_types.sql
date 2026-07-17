-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE TYPE public.card_state AS ENUM (
    'new',
    'learning',
    'young',
    'mature',
    'relearn'
);


ALTER TYPE public.card_state OWNER TO postgres;


CREATE TYPE public.feedback_status AS ENUM (
    'new',
    'accepted',
    'rejected',
    'in-progress',
    'done'
);


ALTER TYPE public.feedback_status OWNER TO postgres;


CREATE TYPE public.feedback_type AS ENUM (
    'idea',
    'bug',
    'other'
);


ALTER TYPE public.feedback_type OWNER TO postgres;


CREATE TYPE public.feedback_visibility AS ENUM (
    'public',
    'internal'
);


ALTER TYPE public.feedback_visibility OWNER TO postgres;


CREATE TYPE public.media_slot AS ENUM (
    'card_front',
    'card_back'
);


ALTER TYPE public.media_slot OWNER TO postgres;


CREATE TYPE public.member_role AS ENUM (
    'user',
    'moderator',
    'admin'
);


ALTER TYPE public.member_role OWNER TO postgres;


CREATE TYPE public.shop_category AS ENUM (
    'power_ups',
    'stationary'
);


ALTER TYPE public.shop_category OWNER TO postgres;


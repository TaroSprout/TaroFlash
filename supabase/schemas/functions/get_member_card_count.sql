-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.get_member_card_count(p_member_id uuid, p_now timestamp with time zone DEFAULT now(), p_only_due_cards boolean DEFAULT true) RETURNS integer
    LANGUAGE sql STABLE
    AS $$
  select count(c.id)::int as card_count
  from public.cards c
  left join public.reviews r on r.card_id = c.id
  where c.member_id = p_member_id
    and (
      not p_only_due_cards
      or (r.due is null or r.due <= p_now)
    );
$$;


ALTER FUNCTION public.get_member_card_count(p_member_id uuid, p_now timestamp with time zone, p_only_due_cards boolean) OWNER TO postgres;


GRANT ALL ON FUNCTION public.get_member_card_count(p_member_id uuid, p_now timestamp with time zone, p_only_due_cards boolean) TO anon;
GRANT ALL ON FUNCTION public.get_member_card_count(p_member_id uuid, p_now timestamp with time zone, p_only_due_cards boolean) TO authenticated;
GRANT ALL ON FUNCTION public.get_member_card_count(p_member_id uuid, p_now timestamp with time zone, p_only_due_cards boolean) TO service_role;


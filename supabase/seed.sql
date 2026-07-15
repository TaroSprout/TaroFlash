-- =============================================================================
-- Local dev seed data — runs automatically after `supabase migrations up`
-- resets the local DB (see [db.seed] in supabase/config.toml).
--
-- Creates one member ("Cheesy") with two decks of dummy cards, so a fresh
-- local DB always has something to look at without manual setup.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Auth user. The create_member_on_new_user() trigger (see migration
--    20250124191125) creates the matching public.members row automatically.
-- -----------------------------------------------------------------------------
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'cheesy@example.com',
  crypt('password', gen_salt('bf')),
  now(),
  jsonb_build_object('display_name', 'Cheesy'),
  now(),
  now(),
  '', '', '', ''
)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 2. Impersonate Cheesy so member_id / rank triggers and RLS policies behave
--    exactly as they would for a real authenticated request (same pattern as
--    tests.set_claims() in supabase/tests/00000_helpers.sql).
-- -----------------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text,
  true
);

set local role = 'authenticated';

-- -----------------------------------------------------------------------------
-- 3. Decks
-- -----------------------------------------------------------------------------
insert into public.decks (title, description)
select 'Deck One', 'Dummy seed deck'
where not exists (
  select 1 from public.decks
  where title = 'Deck One' and member_id = '00000000-0000-0000-0000-000000000001'
);

insert into public.decks (title, description)
select 'Deck Two', 'Dummy seed deck'
where not exists (
  select 1 from public.decks
  where title = 'Deck Two' and member_id = '00000000-0000-0000-0000-000000000001'
);

-- -----------------------------------------------------------------------------
-- 4. Cards — via bulk_insert_cards_in_deck, same RPC the FE card importer
--    uses (never raw cards.insert; rank must be server-computed).
-- -----------------------------------------------------------------------------
select public.bulk_insert_cards_in_deck(
  (select id from public.decks
   where title = 'Deck One' and member_id = '00000000-0000-0000-0000-000000000001'),
  (select jsonb_agg(jsonb_build_object(
     'front_text', 'Card ' || i || ' front',
     'back_text', 'Card ' || i || ' back'
   ))
   from generate_series(1, 500) i)
)
where not exists (
  select 1 from public.cards c
  join public.decks d on d.id = c.deck_id
  where d.title = 'Deck One' and d.member_id = '00000000-0000-0000-0000-000000000001'
);

select public.bulk_insert_cards_in_deck(
  (select id from public.decks
   where title = 'Deck Two' and member_id = '00000000-0000-0000-0000-000000000001'),
  (select jsonb_agg(jsonb_build_object(
     'front_text', 'Card ' || i || ' front',
     'back_text', 'Card ' || i || ' back'
   ))
   from generate_series(1, 200) i)
)
where not exists (
  select 1 from public.cards c
  join public.decks d on d.id = c.deck_id
  where d.title = 'Deck Two' and d.member_id = '00000000-0000-0000-0000-000000000001'
);

set local role = 'postgres';
select set_config('request.jwt.claims', '', true);

commit;

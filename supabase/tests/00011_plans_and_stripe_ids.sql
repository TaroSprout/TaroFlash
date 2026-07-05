-- =============================================================================
-- Plans lookup table + Stripe identifier columns on members
-- Introduced in 20260417000000_plans-table-and-stripe-ids.sql
--
--   - plans table seeded with 'free' and 'paid'
--   - Authenticated users can read active plans only
--   - members.plan is FK → plans.id (ensures no orphan plan values)
--   - Self-update guard extended: users cannot modify their own
--     stripe_customer_id or stripe_subscription_id
--   - Admins can still modify these via the existing admin policy
--   - auth_plan() now returns text (was member_plan enum)
-- =============================================================================

BEGIN;

SELECT plan(12);

-- ── Setup (as postgres superuser) ─────────────────────────────────────────────
SELECT tests.create_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'alice');
SELECT tests.create_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'bob');
SELECT tests.create_user('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'carol_admin');

UPDATE public.members SET role = 'admin'
  WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

-- Stamp a stripe_customer_id on Bob (as superuser, bypassing RLS) so we can
-- test that a user cannot change it out from under the webhook.
UPDATE public.members
  SET stripe_customer_id = 'cus_bob_original'
  WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

-- Seed an inactive plan to test visibility filtering.
INSERT INTO public.plans (id, is_active) VALUES
  ('legacy', false);


-- ── Plans table content ───────────────────────────────────────────────────────

-- Test 1: free plan exists and was seeded by the migration
SELECT ok(
  EXISTS(SELECT 1 FROM public.plans WHERE id = 'free'),
  'plans seeded the free tier'
);

-- Test 2: paid plan exists and was seeded by the migration
SELECT ok(
  EXISTS(SELECT 1 FROM public.plans WHERE id = 'paid'),
  'plans seeded the paid tier'
);


-- ── FK integrity ──────────────────────────────────────────────────────────────

-- Test 3: inserting a member with an unknown plan is rejected by the FK
SELECT throws_ok(
  $$
    INSERT INTO public.members (id, display_name, plan)
    VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid, 'ellie', 'nonexistent')
  $$,
  '23503',
  NULL,
  'members.plan is FK-constrained to plans.id'
);


-- ── Act as Alice (plain user) ─────────────────────────────────────────────────
SELECT tests.set_claims('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid);
SET LOCAL role = 'authenticated';

-- Test 4: active plans are readable by authenticated users
SELECT ok(
  (SELECT count(*) FROM public.plans WHERE id IN ('free', 'paid')) = 2,
  'authenticated user can read active plans'
);

-- Test 5: inactive plans are hidden from authenticated users
SELECT is(
  (SELECT count(*)::int FROM public.plans WHERE id = 'legacy'),
  0,
  'inactive plans are not visible to authenticated users'
);

-- Test 6: auth_plan() returns text (callable on text column post-migration)
SELECT is(
  public.auth_plan(),
  'free',
  'auth_plan() returns text and reflects the caller plan'
);

-- Test 7: Alice can update a non-privileged field on her own row
SELECT lives_ok(
  $$
    UPDATE public.members
    SET description = 'a new bio'
    WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  'non-privileged self-update still works after the guard is extended'
);

-- Test 8: Alice CANNOT set her own stripe_customer_id (webhook-only field)
SELECT throws_ok(
  $$
    UPDATE public.members
    SET stripe_customer_id = 'cus_alice_hacked'
    WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  NULL,
  NULL,
  'user cannot set their own stripe_customer_id'
);

-- Test 9: Alice CANNOT set her own stripe_subscription_id
SELECT throws_ok(
  $$
    UPDATE public.members
    SET stripe_subscription_id = 'sub_alice_hacked'
    WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  NULL,
  NULL,
  'user cannot set their own stripe_subscription_id'
);


-- ── Act as Bob (try to overwrite an existing stripe_customer_id) ──────────────
SET LOCAL role = 'postgres';
SELECT tests.set_claims('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid);
SET LOCAL role = 'authenticated';

-- Test 10: Bob cannot change his existing stripe_customer_id to something else
SELECT throws_ok(
  $$
    UPDATE public.members
    SET stripe_customer_id = 'cus_bob_tampered'
    WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  $$,
  NULL,
  NULL,
  'user cannot overwrite their existing stripe_customer_id'
);


-- ── Act as Carol (admin) ──────────────────────────────────────────────────────
SET LOCAL role = 'postgres';
SELECT tests.set_claims('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid);
SET LOCAL role = 'authenticated';

-- Test 11: Admin can set another member's stripe_customer_id
SELECT lives_ok(
  $$
    UPDATE public.members
    SET stripe_customer_id = 'cus_bob_by_admin'
    WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  $$,
  'admin can set another user''s stripe_customer_id'
);

-- Test 12: Admin can set another member's stripe_subscription_id
SELECT lives_ok(
  $$
    UPDATE public.members
    SET stripe_subscription_id = 'sub_bob_by_admin'
    WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  $$,
  'admin can set another user''s stripe_subscription_id'
);


SELECT * FROM finish();
ROLLBACK;

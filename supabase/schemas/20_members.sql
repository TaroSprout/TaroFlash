-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE TABLE public.members (
    id uuid NOT NULL,
    display_name text NOT NULL,
    created_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    description text,
    avatar_url text,
    email text,
    role public.member_role DEFAULT 'user'::public.member_role NOT NULL,
    plan text DEFAULT 'free'::text NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    preferences jsonb DEFAULT '{}'::jsonb NOT NULL,
    cover_config jsonb,
    -- Soft-delete marker. NULL = live account. Non-NULL = deletion requested,
    -- and this is the moment the purge cron may hard-delete the account.
    --
    -- Stores the deadline rather than the request time so the window a member
    -- was promised stays fixed even if we change the grace period later.
    --
    -- NO COLUMN DEFAULT, deliberately: a DEFAULT fires on INSERT, and the
    -- signup trigger inserts members rows without naming this column — so a
    -- default of `now() + interval '30 days'` would mark every new signup as
    -- pending deletion. The grace window lives in begin_account_deletion()
    -- below, which is the only thing that ever stamps this column.
    delete_at timestamp with time zone,
    -- Account-level grace deadline for a free downgrade with too many decks.
    -- NULL = no pending downgrade sweep. Non-NULL = the member downgraded to
    -- free while over their plan's deck_limit, and this is when the purge cron
    -- may hard-delete every deck ranked beyond the limit.
    --
    -- Locked-ness is NOT stored per deck: a deck is locked precisely while this
    -- is set, the member is on `free`, and the deck sits beyond deck_limit by
    -- rank. Reordering therefore changes which decks are locked with no extra
    -- write — the rank IS the lock state. See deck_lock_deadline().
    --
    -- Same NO-DEFAULT reasoning as delete_at: begin_downgrade_grace() is the
    -- only writer, so a fresh signup never gets stamped.
    downgrade_delete_at timestamp with time zone
);


ALTER TABLE public.members OWNER TO postgres;


ALTER TABLE ONLY public.members
    ADD CONSTRAINT "Users_pkey" PRIMARY KEY (id);


CREATE UNIQUE INDEX members_display_name_key ON public.members (lower(display_name));


ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_stripe_customer_id_key UNIQUE (stripe_customer_id);


ALTER TABLE ONLY public.members
    ADD CONSTRAINT "Users_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


CREATE FUNCTION public.create_member_on_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$begin
  insert into public.members (
    id,
    display_name,
    avatar_url,
    email
  )
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'user_name',
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url',
    new.email
  )
  on conflict (id) do nothing;

  return new;
end;$$;


ALTER FUNCTION public.create_member_on_new_user() OWNER TO postgres;


GRANT ALL ON FUNCTION public.create_member_on_new_user() TO anon;
GRANT ALL ON FUNCTION public.create_member_on_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.create_member_on_new_user() TO service_role;


CREATE FUNCTION public.is_display_name_available(candidate text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select not exists (
    select 1 from public.members
    where lower(display_name) = lower(trim(candidate))
  );
$$;


ALTER FUNCTION public.is_display_name_available(text) OWNER TO postgres;


GRANT EXECUTE ON FUNCTION public.is_display_name_available(text) TO anon;
GRANT EXECUTE ON FUNCTION public.is_display_name_available(text) TO authenticated;


-- Narrow, safe read across the members RLS boundary. SELECT on `members` is
-- restricted to your own row (below), which would blank out other members'
-- profiles anywhere the app legitimately shows them (feedback author,
-- public-deck author). This SECURITY DEFINER helper runs as the owner so it can
-- read any member row, but it only ever projects the public-profile fields —
-- display_name, description, cover_config (banner/theme/avatar) — never email /
-- stripe ids / preferences / role / plan. Invoker functions call it via LATERAL
-- to surface author identity without exposing full rows to arbitrary direct
-- queries.
CREATE TYPE public.member_profile AS (
    display_name text,
    description text,
    cover_config jsonb
);


ALTER TYPE public.member_profile OWNER TO postgres;


CREATE FUNCTION public.member_public_profile(p_member_id uuid) RETURNS SETOF public.member_profile
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT m.display_name, m.description, m.cover_config
  FROM public.members m
  WHERE m.id = p_member_id
    -- A pending-deletion member is hidden from everyone else: returning no rows
    -- makes callers fall back to their anonymous-author display. Free to check
    -- here — this function is already reading the row the flag lives on, so it
    -- costs no extra lookup, unlike filtering by owner in a hot read policy.
    AND m.delete_at IS NULL;
$$;


ALTER FUNCTION public.member_public_profile(uuid) OWNER TO postgres;


GRANT EXECUTE ON FUNCTION public.member_public_profile(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.member_public_profile(uuid) TO authenticated;


-- --- account deletion lifecycle -------------------------------------------
-- Two halves of one reversible operation. Both are single transactions, so the
-- marker and the deck visibility change can never land apart from each other.

-- Marks an account pending deletion and returns the deadline. Idempotent: a
-- second call returns the original deadline untouched, so an FE retry can't
-- silently extend the window a member was promised.
--
-- SECURITY INVOKER, not DEFINER. Only service_role holds EXECUTE (below), and
-- service_role bypasses RLS, so invoker is enough to write the frozen
-- `delete_at` column. Choosing invoker means that if this function is ever
-- granted to `authenticated` by accident, the RLS freeze still stops a member
-- stamping their own row — a DEFINER function would hand them that power the
-- moment the grant slipped.
CREATE FUNCTION public.begin_account_deletion(p_member_id uuid) RETURNS timestamp with time zone
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  -- The grace period lives here, in the only writer of delete_at. Confirm the
  -- length with counsel before launch; GDPR wants erasure "without undue delay".
  v_grace   interval := interval '30 days';
  v_deadline timestamptz;
BEGIN
  SELECT m.delete_at INTO v_deadline
  FROM public.members m
  WHERE m.id = p_member_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No member %', p_member_id USING errcode = 'no_data_found';
  END IF;

  IF v_deadline IS NOT NULL THEN
    RETURN v_deadline;
  END IF;

  v_deadline := now() + v_grace;

  UPDATE public.members
  SET delete_at = v_deadline
  WHERE id = p_member_id;

  -- Hide the account from everyone else without taxing any read path. Flipping
  -- their public decks private here is one write over one member's rows; the
  -- alternative — teaching the public-read policies to check whether each deck's
  -- owner is pending — would add a per-row members lookup to every public deck
  -- and card read in the app, forever. The flag records which decks to put back.
  UPDATE public.decks
  SET is_public = false,
      unpublished_by_deletion = true
  WHERE member_id = p_member_id
    AND is_public;

  RETURN v_deadline;
END;
$$;


ALTER FUNCTION public.begin_account_deletion(uuid) OWNER TO postgres;


-- Only the request-account-deletion edge function may call this, using its
-- service-role client. Keeping it off PostgREST's authenticated RPC surface is
-- what stops a member marking themselves deleted directly and skipping the
-- Stripe cancellation — they'd lose access while still being billed.
REVOKE ALL ON FUNCTION public.begin_account_deletion(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.begin_account_deletion(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.begin_account_deletion(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.begin_account_deletion(uuid) TO service_role;


-- Un-deletes the caller's own account within the grace window: clears the
-- marker and re-publishes exactly the decks that were public before.
--
-- SECURITY DEFINER, and scoped to auth.uid() internally — it has to write
-- `delete_at`, which the self-update policy freezes against the member's own
-- client, and it has to work while the caller is suspended. Hence auth.uid()
-- rather than active_member_id(): the whole point is to run while pending, so
-- the suspend primitive would return NULL and match nothing.
--
-- Idempotent, matching begin_account_deletion(): restoring an account that
-- isn't pending returns NULL rather than raising. "Your account is already
-- live" is the outcome the caller wanted, not a failure — and raising made it
-- one the UI couldn't act on, since the restore dialog is deliberately
-- non-dismissable and left the member with nothing but a sign-out button.
-- An expired grace window still raises: there the answer is genuinely no.
CREATE FUNCTION public.restore_account() RETURNS timestamp with time zone
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_member_id uuid := auth.uid();
  v_deadline  timestamptz;
BEGIN
  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING errcode = 'insufficient_privilege';
  END IF;

  SELECT m.delete_at INTO v_deadline
  FROM public.members m
  WHERE m.id = v_member_id
  FOR UPDATE;

  IF v_deadline IS NULL THEN
    RETURN NULL;
  END IF;

  -- Past the deadline the purge job may already be mid-sweep; refusing here
  -- avoids racing it and resurrecting an account whose data is being erased.
  IF v_deadline <= now() THEN
    RAISE EXCEPTION 'Grace period expired' USING errcode = 'invalid_parameter_value';
  END IF;

  UPDATE public.members
  SET delete_at = NULL
  WHERE id = v_member_id;

  UPDATE public.decks
  SET is_public = true,
      unpublished_by_deletion = false
  WHERE member_id = v_member_id
    AND unpublished_by_deletion;

  RETURN v_deadline;
END;
$$;


ALTER FUNCTION public.restore_account() OWNER TO postgres;


REVOKE ALL ON FUNCTION public.restore_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_account() TO service_role;


-- Fires the daily purge-accounts edge function. Mirrors invoke_cleanup_media()
-- and reuses the same two Vault secrets, which already exist for it.
--
-- SECURITY DEFINER because vault.decrypted_secrets is readable only by the owner.
-- That makes the EXECUTE grant the whole security boundary: on PostgREST's RPC
-- surface this would let any holder of the public anon key trigger a
-- service-role account purge, straight past the edge function's own caller gate.
-- The REVOKEs live in the accompanying cron migration, since `supabase db diff`
-- does not emit function grants.
--
-- net.http_post is fire-and-forget; it returns a request id and the response
-- lands in net._http_response later:
--   SELECT * FROM net._http_response ORDER BY created DESC LIMIT 10;
CREATE FUNCTION public.invoke_purge_accounts() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_url         text;
  v_service_key text;
BEGIN
  SELECT decrypted_secret INTO v_url
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_url'
  LIMIT 1;

  IF v_url IS NULL THEN
    RAISE EXCEPTION
      'Vault secret "supabase_url" not found. '
      'Run: SELECT vault.create_secret(''<url>'', ''supabase_url'');';
  END IF;

  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  IF v_service_key IS NULL THEN
    RAISE EXCEPTION
      'Vault secret "service_role_key" not found. '
      'Run: SELECT vault.create_secret(''<key>'', ''service_role_key'');';
  END IF;

  PERFORM net.http_post(
    url     := v_url || '/functions/v1/purge-accounts',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_service_key,
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  );
END;
$$;


ALTER FUNCTION public.invoke_purge_accounts() OWNER TO postgres;


REVOKE ALL ON FUNCTION public.invoke_purge_accounts() FROM PUBLIC;


-- --- downgrade grace lifecycle --------------------------------------------
-- The free-downgrade analog of the account-deletion pair above. Same shape:
-- one writer stamps the grace deadline, one writer clears it, both single
-- transactions, both service_role-only so a member can't self-serve either
-- direction (which would let them dodge the deck sweep while unsubscribed).
--
-- Unlike the account pair there is no per-row "unpublish" bookkeeping: locking
-- derives from rank + plan + this column (see deck_lock_deadline), so stamping
-- the deadline IS the lock and clearing it IS the unlock — nothing to record.

-- Called by the stripe-webhook markFree() path after it flips the member to
-- `free`. Idempotent: a re-fired webhook returns the original deadline rather
-- than sliding the window the member was promised. Stamps nothing when the
-- member is at or under their plan's deck_limit — there is no over-limit deck to
-- schedule, so a 10-deck downgrade gets no deadline and nothing locks.
--
-- SECURITY INVOKER (the plpgsql default), matching begin_account_deletion: only
-- service_role holds EXECUTE and it bypasses RLS, so an accidental grant to
-- `authenticated` still can't stamp a row past the members self-update freeze.
CREATE FUNCTION public.begin_downgrade_grace(p_member_id uuid) RETURNS timestamp with time zone
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  -- The grace window lives here, in the only writer of downgrade_delete_at.
  v_grace    interval := interval '15 days';
  v_deadline timestamptz;
  v_limit    int;
  v_count    int;
BEGIN
  SELECT m.downgrade_delete_at, p.deck_limit
    INTO v_deadline, v_limit
  FROM public.members m
  JOIN public.plans p ON p.id = m.plan
  WHERE m.id = p_member_id
  FOR UPDATE OF m;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No member %', p_member_id USING errcode = 'no_data_found';
  END IF;

  IF v_deadline IS NOT NULL THEN
    RETURN v_deadline;
  END IF;

  -- NULL deck_limit = unlimited plan: nothing is ever over the line.
  IF v_limit IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.decks
  WHERE member_id = p_member_id;

  IF v_count <= v_limit THEN
    RETURN NULL;
  END IF;

  v_deadline := now() + v_grace;

  UPDATE public.members
  SET downgrade_delete_at = v_deadline
  WHERE id = p_member_id;

  RETURN v_deadline;
END;
$$;


ALTER FUNCTION public.begin_downgrade_grace(uuid) OWNER TO postgres;


-- Keep off PostgREST's authenticated RPC surface: a member clearing this
-- themselves would unlock every deck while still unsubscribed and dodge the
-- sweep. Only the webhook (service role) calls it.
REVOKE ALL ON FUNCTION public.begin_downgrade_grace(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.begin_downgrade_grace(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.begin_downgrade_grace(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.begin_downgrade_grace(uuid) TO service_role;


-- Called by the stripe-webhook upgrade path (syncSubscription, active). Clears
-- the deadline, which unlocks every deck at once because locking is derived.
-- Idempotent: clearing an already-clear member is a no-op.
CREATE FUNCTION public.clear_downgrade_grace(p_member_id uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.members
  SET downgrade_delete_at = NULL
  WHERE id = p_member_id
    AND downgrade_delete_at IS NOT NULL;
END;
$$;


ALTER FUNCTION public.clear_downgrade_grace(uuid) OWNER TO postgres;


REVOKE ALL ON FUNCTION public.clear_downgrade_grace(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clear_downgrade_grace(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.clear_downgrade_grace(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.clear_downgrade_grace(uuid) TO service_role;


ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Enable insert for authenticated users" ON public.members FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


-- DELIBERATELY on auth.uid(), NOT active_member_id(). This is the one ownership
-- policy the suspend sweep must skip: a member whose account is pending deletion
-- has to keep reading their own row, or the app can't tell they're pending, can't
-- render the pending screen, and can't offer them a restore. Suspending this
-- would make the grace period unreachable and effectively irreversible.
CREATE POLICY "members can read their own row" ON public.members FOR SELECT TO authenticated USING ((auth.uid() = id));


CREATE POLICY "admins can update any member" ON public.members FOR UPDATE TO authenticated USING (public.can_manage_members()) WITH CHECK (public.can_manage_members());


-- Self-service profile edits. Privileged columns are frozen by requiring the
-- new value to equal the stored one, so a PostgREST write that touches them
-- fails the check instead of being silently ignored.
--
-- `delete_at` joins that frozen list: a member must not be able to mark their
-- own account pending (which would skip the Stripe cancellation and leave them
-- paying for an account they can't reach) or clear the marker (which would skip
-- the deck re-publishing and the plan/subscription reality of a restore). Both
-- directions go through the definer functions below instead.
--
-- `downgrade_delete_at` is frozen for the same reason: a member clearing it
-- would unlock every deck while still on free and slip past the deletion sweep;
-- only the stripe-webhook (service role) may write it.
--
-- USING is on active_member_id(), so a pending member's profile edits match zero
-- rows — suspension covers writes to their own row too. The frozen-field
-- subqueries stay on auth.uid() because they only re-read the current row, and
-- USING has already gated whether the update happens at all.
CREATE POLICY "members can update their own non-privileged fields" ON public.members FOR UPDATE TO authenticated USING ((( SELECT public.active_member_id() AS active_member_id) = id)) WITH CHECK (((( SELECT public.active_member_id() AS active_member_id) = id) AND (role = ( SELECT members_1.role
   FROM public.members members_1
  WHERE (members_1.id = auth.uid()))) AND (plan = ( SELECT members_1.plan
   FROM public.members members_1
  WHERE (members_1.id = auth.uid()))) AND (NOT (stripe_customer_id IS DISTINCT FROM ( SELECT members_1.stripe_customer_id
   FROM public.members members_1
  WHERE (members_1.id = auth.uid())))) AND (NOT (stripe_subscription_id IS DISTINCT FROM ( SELECT members_1.stripe_subscription_id
   FROM public.members members_1
  WHERE (members_1.id = auth.uid())))) AND (NOT (delete_at IS DISTINCT FROM ( SELECT members_1.delete_at
   FROM public.members members_1
  WHERE (members_1.id = auth.uid())))) AND (NOT (downgrade_delete_at IS DISTINCT FROM ( SELECT members_1.downgrade_delete_at
   FROM public.members members_1
  WHERE (members_1.id = auth.uid()))))));


GRANT ALL ON TABLE public.members TO anon;
GRANT ALL ON TABLE public.members TO authenticated;
GRANT ALL ON TABLE public.members TO service_role;


-- Whether this account can sign in with a password, which the client cannot
-- work out for itself.
--
-- `user.identities` is the obvious source and is wrong: GoTrue creates the
-- `email` identity at email signup and never on updateUser({ password }), so a
-- Google-origin account that sets a password still shows no email identity
-- forever. app_metadata.providers mirrors identities, so it has the same hole.
--
-- Definer because auth.users carries no grants to `authenticated` — an invoker
-- function would only ever get "permission denied".
--
-- The empty-string check is not redundant: GoTrue stores '' rather than NULL
-- for accounts that never had a password in some versions, and `'' IS NOT NULL`
-- is true, which would claim a password that isn't there.
CREATE FUNCTION public.member_has_password() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from auth.users
    where id = (select auth.uid())
      and encrypted_password is not null
      and encrypted_password <> ''
  );
$$;


REVOKE ALL ON FUNCTION public.member_has_password() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.member_has_password() FROM anon;
GRANT EXECUTE ON FUNCTION public.member_has_password() TO authenticated;

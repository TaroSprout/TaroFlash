// Starts an account deletion: marks the account pending, stops the billing, and
// signs the member out everywhere.
//
// ORDERING IS THE WHOLE DESIGN. Postgres and Stripe share no transaction, so one
// of these writes can land without the other. The order picks which failure you
// get when that happens:
//
//   Stripe first  → the cancel succeeds, the DB write fails. The subscription is
//                   dead, the account was never marked pending. The member thinks
//                   they deleted their account but is still logged in, still on a
//                   paid plan nobody is billing, with no purge scheduled. Silent,
//                   permanent, and only ever found by a confused human.
//
//   DB first      → the marker lands, the Stripe cancel fails. The account is
//                   pending and access is already blocked, but the subscription
//                   keeps billing. Bad — but loud (logged), bounded (at most one
//                   grace window), and self-healing: the purge job retries the
//                   cancel before it deletes anything, and the invoice webhook
//                   refunds any charge that slips through in the meantime.
//
// So: marker, then Stripe, then sign-out. Sign-out is last and not load-bearing —
// if it fails, existing sessions survive until their tokens expire, and RLS is
// already returning them zero rows.
//
// The endpoint is idempotent. begin_account_deletion() returns the original
// deadline if one is already set, so a client retry can't extend the window the
// member was promised, and cancelling an already-cancelled subscription is a
// no-op to Stripe.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { makeStripe } from '../_shared/stripe.ts'
import {
  cancelWithProratedRefund,
  type ProratedRefundOutcome,
  type StripeRefundLike
} from '../_shared/prorated-refund.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

export type AuthedUser = { id: string }

export type Deps = {
  stripe: StripeRefundLike
  // Resolves the Authorization header to the caller, or null if invalid.
  getUser: (authHeader: string) => Promise<AuthedUser | null>
  // Service-role client. Required, not a convenience: `delete_at` is frozen
  // against the member's own client by RLS, and begin_account_deletion() is
  // granted to service_role only.
  admin: SupabaseClient
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' }
  })
}

function err(message: string, status = 400) {
  return new Response(message, { status, headers: cors })
}

// No capability check here, deliberately. requireCapability() exists for grants
// that only some members hold; deleting your own account is not one of those, and
// a can_delete_own_account() that returns true for everyone would be a gate in
// name only. Being the authenticated owner IS the authorization — every write
// below is scoped to the id resolved from the caller's own JWT.
export async function handler(req: Request, deps: Deps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return err('Method Not Allowed', 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return err('Unauthorized', 401)

  const user = await deps.getUser(authHeader)
  if (!user) return err('Unauthorized', 401)

  const { admin, stripe } = deps

  // 1. The marker. Fail here and nothing else has happened yet, which is the
  //    only fully-recoverable failure in this sequence.
  const { data: deleteAt, error: markError } = await admin.rpc('begin_account_deletion', {
    p_member_id: user.id
  })

  if (markError) {
    console.error('begin_account_deletion failed', markError)
    return err('Could not start account deletion', 500)
  }

  // 2. Stop the billing. Scoped by id explicitly — the service-role client
  //    bypasses RLS, so nothing else constrains which row this reads.
  const { data: member } = await admin
    .from('members')
    .select('stripe_subscription_id, stripe_customer_id')
    .eq('id', user.id)
    .single()

  const refund = await cancelSubscriptionIfAny(stripe, member)

  // 3. Revoke sessions on every device. Best-effort by design.
  await signOutEverywhere(admin, authHeader)

  return json({ deleteAt, refund })
}

type MemberBilling = { stripe_subscription_id: string | null; stripe_customer_id: string | null }

/**
 * Cancels the member's subscription with a prorated refund, if they have one.
 *
 * Never throws: the account is already marked pending at this point, so failing
 * the whole request would leave the member unable to retry into a better state
 * while telling them nothing worked. A failure here is logged and left for the
 * purge job to retry.
 */
async function cancelSubscriptionIfAny(
  stripe: StripeRefundLike,
  member: MemberBilling | null
): Promise<ProratedRefundOutcome | null> {
  if (!member?.stripe_subscription_id || !member.stripe_customer_id) return null

  try {
    const { refund } = await cancelWithProratedRefund(
      stripe,
      member.stripe_customer_id,
      member.stripe_subscription_id
    )
    return refund
  } catch (e) {
    // Loud: this is the case where the account is pending but still billing.
    console.error(
      `Stripe cancel failed for subscription ${member.stripe_subscription_id} — ` +
        `account is pending deletion but STILL BILLING. purge-accounts will retry.`,
      e
    )
    return null
  }
}

/** Revokes every session for the caller. Logged and swallowed on failure. */
async function signOutEverywhere(admin: SupabaseClient, authHeader: string): Promise<void> {
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader

  const { error } = await admin.auth.admin.signOut(token, 'global')
  if (!error) return

  // Not fatal: RLS already returns zero rows for a pending account, so a
  // surviving session can't reach any data — it just isn't formally revoked.
  console.warn('Global sign-out failed; sessions will lapse at token expiry', error)
}

if (import.meta.main) {
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const stripe = makeStripe()

  Deno.serve((req) =>
    handler(req, {
      stripe,
      admin,
      getUser: async (authHeader) => {
        const userClient = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_ANON_KEY')!,
          { global: { headers: { Authorization: authHeader } } }
        )
        const {
          data: { user },
          error: authError
        } = await userClient.auth.getUser()
        return authError || !user ? null : user
      }
    })
  )
}

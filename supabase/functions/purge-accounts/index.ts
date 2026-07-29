// Hard-deletes accounts whose grace period has run out. Invoked daily by pg_cron
// via invoke_purge_accounts().
//
// This is the irreversible end of the deletion flow, so it is deliberately dull:
// it only ever touches rows whose `delete_at` is already in the past, it cancels
// any subscription that somehow survived before deleting anything, and it deletes
// through auth.admin.deleteUser so the existing auth.users → members → everything
// cascade does the actual erasing. There is no bespoke delete order to get wrong.
//
// NO RACE WITH RESTORE. A member could in principle restore between this
// function's SELECT and its DELETE. They can't: restore_account() refuses once
// `delete_at` has passed, and this function only ever selects rows where it has.
// The two windows cannot overlap.
//
// Media is not deleted here. Dropping the members row fires
// trg_member_delete_soft_delete_media, which soft-deletes their media rows, and
// cleanup-media reaps the storage objects on its own schedule.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { assertServiceRole } from '../_shared/assert-service-role.ts'
import { makeStripe } from '../_shared/stripe.ts'
import type { Stripe } from '../_shared/stripe.ts'

const BATCH_SIZE = 100

type StripeLike = Pick<Stripe, 'subscriptions'>

export type Deps = {
  supabase: SupabaseClient
  stripe: StripeLike
}

type ExpiredAccount = {
  id: string
  delete_at: string
  stripe_subscription_id: string | null
}

type PurgeReport = {
  purged: number
  failed: string[]
  cancelled: number
}

/**
 * Last-chance cancel for a subscription that outlived the deletion request.
 *
 * Reaching this means the request-time cancel failed and the account has been
 * billing through the grace window — each of those charges was refunded by the
 * invoice.payment_succeeded webhook, so there is nothing to prorate here; the
 * job just stops the billing before the customer record loses its owner.
 *
 * Returns whether it cancelled anything. Never throws: a Stripe problem must not
 * block the erasure the member asked for, and the alternative — leaving the
 * account undeleted because Stripe is down — is worse than an orphaned
 * subscription we can see in the logs.
 */
async function cancelSurvivingSubscription(
  stripe: StripeLike,
  account: ExpiredAccount
): Promise<boolean> {
  if (!account.stripe_subscription_id) return false

  try {
    await stripe.subscriptions.cancel(account.stripe_subscription_id)
    console.warn(
      `Subscription ${account.stripe_subscription_id} was still live at purge time ` +
        `for member ${account.id} — the request-time cancel must have failed.`
    )
    return true
  } catch (err) {
    console.error(`Purge-time cancel failed for ${account.stripe_subscription_id}:`, err)
    return false
  }
}

/**
 * Deletes the auth user, which cascades to the members row and everything it
 * owns. Returns null on success or the member id on failure, so the caller can
 * report which accounts survived without aborting the rest of the batch.
 */
async function purgeAccount(
  supabase: SupabaseClient,
  account: ExpiredAccount
): Promise<string | null> {
  const { error } = await supabase.auth.admin.deleteUser(account.id)

  if (error) {
    console.error(`Failed to purge member ${account.id}:`, error)
    return account.id
  }

  console.log(`Purged member ${account.id} (delete_at ${account.delete_at})`)
  return null
}

export async function handler({ supabase, stripe }: Deps): Promise<Response> {
  const { data: expired, error } = await supabase
    .from('members')
    .select('id, delete_at, stripe_subscription_id')
    .not('delete_at', 'is', null)
    .lt('delete_at', new Date().toISOString())
    .limit(BATCH_SIZE)

  if (error) {
    console.error('Could not list expired accounts:', error)
    return new Response(JSON.stringify({ error: 'select_failed' }), { status: 500 })
  }

  const accounts = (expired ?? []) as ExpiredAccount[]
  const report: PurgeReport = { purged: 0, failed: [], cancelled: 0 }

  for (const account of accounts) {
    const cancelled = await cancelSurvivingSubscription(stripe, account)
    if (cancelled) report.cancelled++

    const failedId = await purgeAccount(supabase, account)
    if (failedId) {
      report.failed.push(failedId)
      continue
    }
    report.purged++
  }

  // 207 when some accounts survived: the run did work but needs a human to look.
  const status = report.failed.length > 0 ? 207 : 200
  return new Response(
    JSON.stringify({
      message: 'Account purge complete',
      considered: accounts.length,
      purged: report.purged,
      subscriptions_cancelled: report.cancelled,
      ...(report.failed.length > 0 && { failed: report.failed })
    }),
    { status }
  )
}

if (import.meta.main) {
  Deno.serve((req) => {
    // verify_jwt = true only proves the token is a validly-signed project JWT —
    // and the public anon key is exactly that. This is what limits the caller to
    // the cron job.
    const denied = assertServiceRole(req)
    if (denied) return denied

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    return handler({ supabase, stripe: makeStripe() })
  })
}

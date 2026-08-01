// Stripe webhook — the single source of truth for subscription state.
//
// Stripe POSTs to this endpoint whenever something interesting happens to a
// subscription. We verify the signature, figure out what changed, and reflect
// it onto the matching `members` row. The client NEVER decides its own plan —
// it just reads whatever this function wrote.
//
// This function is public (no JWT): Stripe doesn't carry Supabase auth. It
// proves it's really Stripe by signing the body with a shared secret
// (STRIPE_WEBHOOK_SECRET); we verify that before trusting anything.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { assertWebhookVersion, makeStripe, Stripe } from '../_shared/stripe.ts'
import { refundInvoiceViaCreditNote } from '../_shared/prorated-refund.ts'

const stripe = makeStripe()

// Node's `crypto` isn't available in Deno, so signature verification gets
// Deno's WebCrypto (SubtleCrypto) provider.
const cryptoProvider = Stripe.createSubtleCryptoProvider()

// Service role bypasses RLS — essential here because the self-update policy
// deliberately blocks the client from touching `plan` / `stripe_*` fields.
// This function is the ONLY writer for those columns in normal flow.
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  // IMPORTANT: raw body. Parsing as JSON first would re-serialize with
  // different key order/whitespace and invalidate the signature.
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    )
  } catch (err) {
    console.error('Signature verification failed:', err)
    return new Response(`Invalid signature: ${(err as Error).message}`, { status: 400 })
  }

  assertWebhookVersion(event)

  try {
    switch (event.type) {
      // Fires when a new subscription is attached to a customer AND when any
      // field on an existing subscription changes (tier swap, renewal, status
      // flip after PaymentIntent confirmation, etc.). Idempotent handler —
      // we mirror whatever the current remote state is.
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await syncSubscription(subscription)
        break
      }

      // Boundary race: a renewal invoice can be paid in the same moments as a
      // deletion request, so the member is charged for a month they will never
      // use. Also the safety net for a deletion whose Stripe cancel failed —
      // that account keeps renewing until the purge, and each renewal lands here.
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await refundIfPendingDeletion(invoice.customer as string, invoice.id as string)
        break
      }

      // User (or Stripe) canceled outright. Demote to free, clear sub id.
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await markFree(subscription.customer as string)
        break
      }

      default:
        // Unhandled event types: ack with 200 so Stripe doesn't retry.
        break
    }
  } catch (err) {
    // Returning 500 makes Stripe retry with exponential backoff — that's what
    // we want if our DB call blipped, but NOT for permanent misconfig.
    // Log loudly so we notice if retries keep failing.
    console.error(`Handler error for ${event.type}:`, err)
    return new Response('Handler error', { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})

// Map Stripe's subscription state → our `members.plan` + stripe_subscription_id.
// Works for both "created/updated" and the post-checkout retrieval path.
async function syncSubscription(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const priceId = subscription.items.data[0]?.price?.id
  const active = subscription.status === 'active' || subscription.status === 'trialing'

  if (!priceId) {
    console.error('Subscription has no price_id', subscription.id)
    return
  }

  // price_id → plan.id via the plans lookup we just built.
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('id')
    .eq('stripe_price_id', priceId)
    .single()

  if (planError || !plan) {
    console.error('No plan matches price_id', priceId, planError)
    return
  }

  const { data: member, error } = await supabase
    .from('members')
    .update({
      plan: active ? plan.id : 'free',
      stripe_subscription_id: active ? subscription.id : null
    })
    .eq('stripe_customer_id', customerId)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('members update failed', error)
    throw error
  }

  if (!member) return

  // Reconcile the downgrade lock. Upgrading (active) clears any grace deadline,
  // unlocking every deck at once; a sync that lands the member on free stamps
  // the 15-day grace when they are over their deck_limit. Both are idempotent.
  await reconcileDowngradeGrace(member.id, active)
}

// Stamp or clear the free-downgrade grace deadline on the member. Locking is
// derived from rank + plan + this deadline, so this single write is the whole
// lock/unlock — no per-deck state to touch. Both RPCs are service_role-only and
// idempotent (begin keeps the original deadline, clear no-ops when already clear).
async function reconcileDowngradeGrace(memberId: string, active: boolean) {
  const rpc = active ? 'clear_downgrade_grace' : 'begin_downgrade_grace'
  const { error } = await supabase.rpc(rpc, { p_member_id: memberId })

  if (error) {
    console.error(`${rpc} failed for member ${memberId}`, error)
    throw error
  }
}

// Money must never be kept from an account that is on its way out.
//
// Only `customer` and `invoice.id` are read from the webhook payload — both
// stable across every API version. Everything else comes from a fresh fetch at
// our own pinned version, so the Dashboard endpoint's version can drift without
// silently breaking this handler.
//
// Note we never look up the charge or payment_intent. Those moved around in the
// 2025-03-31.basil invoice reshape (invoice.charge and invoice.payment_intent are
// gone; the payment hangs off invoice.payments, which needs expanding). Refunding
// through a credit note against the invoice sidesteps that entirely — Stripe
// resolves the payment itself — so there's no version-sensitive traversal here.
async function refundIfPendingDeletion(customerId: string, invoiceId: string) {
  const { data: member, error } = await supabase
    .from('members')
    .select('id, delete_at, stripe_subscription_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (error) {
    console.error('Could not check deletion state for customer', customerId, error)
    throw error
  }

  // The overwhelmingly common case: a normal renewal for a live account.
  if (!member?.delete_at) return

  console.warn(
    `Invoice ${invoiceId} was paid by member ${member.id}, whose account is ` +
      `pending deletion (delete_at ${member.delete_at}). Refunding and re-asserting cancel.`
  )

  const invoice = await stripe.invoices.retrieve(invoiceId)

  // Full amount, not a proration: this charge should never have been collected.
  // Idempotent via the credit-note cap, so a Stripe retry of this event can't
  // refund twice.
  const refund = await refundInvoiceViaCreditNote(stripe, invoice)
  console.log(`Refund outcome for invoice ${invoiceId}:`, refund)

  await reassertCancellation(member.stripe_subscription_id)
}

// The charge proves billing was still live, so the original cancel evidently
// didn't take. Cancel plainly — no proration, since the whole invoice was just
// refunded and prorating on top would credit the same period twice.
async function reassertCancellation(subscriptionId: string | null) {
  if (!subscriptionId) return

  try {
    await stripe.subscriptions.cancel(subscriptionId)
  } catch (err) {
    // Already cancelled is the expected outcome here and reads as an error from
    // Stripe. Either way the refund above is the part that matters.
    console.warn(`Re-asserting cancel on ${subscriptionId} failed (may already be gone):`, err)
  }
}

async function markFree(customerId: string) {
  const { data: member, error } = await supabase
    .from('members')
    .update({ plan: 'free', stripe_subscription_id: null })
    .eq('stripe_customer_id', customerId)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('members downgrade failed', error)
    throw error
  }

  if (!member) return

  // Lock over-limit decks and schedule their deletion. Idempotent: a re-fired
  // deletion event keeps the original 15-day deadline.
  await reconcileDowngradeGrace(member.id, false)
}

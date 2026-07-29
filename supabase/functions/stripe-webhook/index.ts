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

  const { error } = await supabase
    .from('members')
    .update({
      plan: active ? plan.id : 'free',
      stripe_subscription_id: active ? subscription.id : null
    })
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('members update failed', error)
    throw error
  }
}

async function markFree(customerId: string) {
  const { error } = await supabase
    .from('members')
    .update({ plan: 'free', stripe_subscription_id: null })
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('members downgrade failed', error)
    throw error
  }
}

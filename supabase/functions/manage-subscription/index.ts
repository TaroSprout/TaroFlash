// Self-hosted replacement for Stripe's Billing Portal.
//
// Single endpoint dispatching on `action`. Member auth via JWT; Stripe
// customer resolved from members.stripe_customer_id (RLS-visible to owner).
// Plan changes use proration_behavior: 'always_invoice' — diff charged now.

import Stripe from 'npm:stripe@20'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient()
})

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

type Payload =
  | { action: 'get-subscription' }
  | { action: 'list-invoices'; limit?: number }
  | { action: 'list-payment-methods' }
  | { action: 'set-default-payment-method'; paymentMethodId: string }
  | { action: 'detach-payment-method'; paymentMethodId: string }
  | { action: 'create-setup-intent' }
  | { action: 'change-plan'; planId: string }
  | { action: 'cancel'; atPeriodEnd: boolean }
  | { action: 'resume' }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' }
  })
}

function err(message: string, status = 400) {
  return new Response(message, { status, headers: cors })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return err('Method Not Allowed', 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return err('Unauthorized', 401)

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const {
    data: { user },
    error: authError
  } = await userClient.auth.getUser()
  if (authError || !user) return err('Unauthorized', 401)

  const payload = (await req.json().catch(() => null)) as Payload | null
  if (!payload?.action) return err('Missing action')

  const { data: member } = await userClient
    .from('members')
    .select('stripe_customer_id, stripe_subscription_id')
    .eq('id', user.id)
    .single()

  const customerId = member?.stripe_customer_id
  if (!customerId) return err('No Stripe customer for this member')

  try {
    switch (payload.action) {
      case 'get-subscription': {
        // No Stripe sub = free member. `null` is the whole payload; the FE
        // reads the member's plan name from the members→plans join instead.
        if (!member?.stripe_subscription_id) return json(null)

        const subscription = await stripe.subscriptions.retrieve(member.stripe_subscription_id, {
          expand: ['items.data.price']
        })

        let upcoming = null
        try {
          upcoming = await stripe.invoices.retrieveUpcoming({ customer: customerId })
        } catch {
          // No upcoming invoice (e.g. subscription canceled).
        }

        // Normalize Stripe's nested shape into the flat domain DTO the pill
        // needs. Money stays in minor units, the date stays a UNIX second —
        // the FE owns locale-specific currency/date formatting.
        const price = subscription.items.data[0]?.price
        return json({
          priceCents: price?.unit_amount ?? null,
          currency: price?.currency ?? null,
          interval: price?.recurring?.interval ?? null,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          upcoming: upcoming
            ? { amountCents: upcoming.amount_due, currency: upcoming.currency }
            : null
        })
      }

      case 'list-invoices': {
        const invoices = await stripe.invoices.list({
          customer: customerId,
          limit: payload.limit ?? 20
        })
        return json({ invoices: invoices.data })
      }

      case 'list-payment-methods': {
        const methods = await stripe.paymentMethods.list({ customer: customerId, type: 'card' })
        const customer = await stripe.customers.retrieve(customerId)
        const defaultId =
          typeof customer !== 'string' && !customer.deleted
            ? (customer.invoice_settings?.default_payment_method as string | null)
            : null
        return json({ paymentMethods: methods.data, defaultPaymentMethodId: defaultId })
      }

      case 'set-default-payment-method': {
        const updated = await stripe.customers.update(customerId, {
          invoice_settings: { default_payment_method: payload.paymentMethodId }
        })
        return json({ customer: updated })
      }

      case 'detach-payment-method': {
        const detached = await stripe.paymentMethods.detach(payload.paymentMethodId)
        return json({ paymentMethod: detached })
      }

      case 'create-setup-intent': {
        const intent = await stripe.setupIntents.create({
          customer: customerId,
          usage: 'off_session',
          payment_method_types: ['card']
        })
        return json({ clientSecret: intent.client_secret })
      }

      case 'change-plan': {
        if (!member?.stripe_subscription_id) return err('No active subscription')

        const admin = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )
        const { data: plan } = await admin
          .from('plans')
          .select('stripe_price_id')
          .eq('id', payload.planId)
          .eq('is_active', true)
          .maybeSingle()

        if (!plan?.stripe_price_id) return err(`Plan not purchasable: ${payload.planId}`)

        const current = await stripe.subscriptions.retrieve(member.stripe_subscription_id)
        const itemId = current.items.data[0]?.id
        if (!itemId) return err('Subscription has no items', 500)

        const updated = await stripe.subscriptions.update(member.stripe_subscription_id, {
          items: [{ id: itemId, price: plan.stripe_price_id }],
          proration_behavior: 'always_invoice',
          cancel_at_period_end: false
        })
        return json({ subscription: updated })
      }

      case 'cancel': {
        if (!member?.stripe_subscription_id) return err('No active subscription')
        const result = payload.atPeriodEnd
          ? await stripe.subscriptions.update(member.stripe_subscription_id, {
              cancel_at_period_end: true
            })
          : await stripe.subscriptions.cancel(member.stripe_subscription_id)
        return json({ subscription: result })
      }

      case 'resume': {
        if (!member?.stripe_subscription_id) return err('No active subscription')
        const resumed = await stripe.subscriptions.update(member.stripe_subscription_id, {
          cancel_at_period_end: false
        })
        return json({ subscription: resumed })
      }

      default:
        return err('Unknown action')
    }
  } catch (e) {
    console.error(e)
    return err(e instanceof Error ? e.message : 'Stripe error', 500)
  }
})

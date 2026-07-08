// Self-hosted replacement for Stripe's Billing Portal.
//
// Single endpoint dispatching on `action`. Member auth via JWT; Stripe
// customer resolved from members.stripe_customer_id (RLS-visible to owner).
// Plan changes use proration_behavior: 'always_invoice' — diff charged now.

import Stripe from 'npm:stripe@20'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

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
  | { action: 'create-setup-intent'; returnUrl: string }
  | { action: 'change-plan'; planId: string }
  | { action: 'cancel'; atPeriodEnd: boolean }
  | { action: 'resume' }

export type StripeLike = Pick<
  Stripe,
  'subscriptions' | 'invoices' | 'paymentMethods' | 'customers' | 'checkout' | 'prices'
>

export type AuthedUser = { id: string }

export type Deps = {
  stripe: StripeLike
  // Resolves the Authorization header to the caller, or null if invalid.
  getUser: (authHeader: string) => Promise<AuthedUser | null>
  // Caller-scoped client (RLS applies) to read the member's Stripe ids.
  getUserClient: (authHeader: string) => SupabaseClient
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

export async function handler(req: Request, deps: Deps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return err('Method Not Allowed', 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return err('Unauthorized', 401)

  const user = await deps.getUser(authHeader)
  if (!user) return err('Unauthorized', 401)

  const payload = (await req.json().catch(() => null)) as Payload | null
  if (!payload?.action) return err('Missing action')

  const userClient = deps.getUserClient(authHeader)
  const { data: member } = await userClient
    .from('members')
    .select('stripe_customer_id, stripe_subscription_id')
    .eq('id', user.id)
    .single()

  const customerId = member?.stripe_customer_id
  if (!customerId) return err('No Stripe customer for this member')

  const { stripe, admin } = deps

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
          upcoming = await stripe.invoices.createPreview({ customer: customerId })
        } catch {
          // No upcoming invoice (e.g. subscription canceled).
        }

        // Normalize Stripe's nested shape into the flat domain DTO the pill
        // needs. Money stays in minor units, the date stays a UNIX second —
        // the FE owns locale-specific currency/date formatting.
        //
        // current_period_end moved off the top-level Subscription object onto
        // each subscription item as of API version 2026-03-25.dahlia.
        const item = subscription.items.data[0]
        const price = item?.price
        return json({
          priceCents: price?.unit_amount ?? null,
          currency: price?.currency ?? null,
          interval: price?.recurring?.interval ?? null,
          status: subscription.status,
          currentPeriodEnd: item?.current_period_end ?? null,
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
        if (!payload.returnUrl) return err('Missing returnUrl')

        // Unlike subscription-mode sessions (which infer currency from
        // line_items), a setup-mode session has no price to infer from — Stripe
        // 400s with "Missing required param: currency" unless we pass it
        // explicitly. Resolve it from the same paid-plan price used to charge
        // the card once it's saved.
        const { data: plan } = await admin
          .from('plans')
          .select('stripe_price_id')
          .eq('id', 'paid')
          .eq('is_active', true)
          .maybeSingle()

        if (!plan?.stripe_price_id) return err('No purchasable plan configured', 500)

        const price = await stripe.prices.retrieve(plan.stripe_price_id)

        // ui_mode: 'elements' is a preview feature not yet in this SDK
        // version's published types — see create-subscription/index.ts.
        const session = await stripe.checkout.sessions.create({
          mode: 'setup',
          ui_mode: 'elements',
          customer: customerId,
          currency: price.currency,
          return_url: payload.returnUrl
        } as unknown as Stripe.Checkout.SessionCreateParams)
        return json({ clientSecret: session.client_secret })
      }

      case 'change-plan': {
        if (!member?.stripe_subscription_id) return err('No active subscription')

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
}

if (import.meta.main) {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    // Preview version — not yet in this SDK's LatestApiVersion type.
    apiVersion: '2026-03-25.dahlia' as Stripe.LatestApiVersion,
    httpClient: Stripe.createFetchHttpClient()
  })

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  Deno.serve((req) =>
    handler(req, {
      stripe,
      admin,
      getUserClient: (authHeader) =>
        createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
          global: { headers: { Authorization: authHeader } }
        }),
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

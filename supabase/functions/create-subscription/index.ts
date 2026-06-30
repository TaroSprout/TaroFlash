// Creates a Checkout Session (subscription mode, embedded UI) for the
// caller's plan.
//
// The client mounts our own Payment Element against the Session's
// client_secret and calls `checkout.confirm()` — appearance stays ours,
// Stripe owns creating the underlying Subscription + PaymentIntent.

import Stripe from 'npm:stripe@20'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

export type StripeLike = Pick<Stripe, 'checkout' | 'customers'>

export type AuthedUser = { id: string; email?: string | null }

export type Deps = {
  admin: SupabaseClient
  stripe: StripeLike
  // Resolves the Authorization header to the caller, or null if invalid.
  getUser: (authHeader: string) => Promise<AuthedUser | null>
}

export async function handler(req: Request, deps: Deps): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: cors })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401, headers: cors })
  }

  const user = await deps.getUser(authHeader)
  if (!user) {
    return new Response('Unauthorized', { status: 401, headers: cors })
  }

  const { admin, stripe } = deps

  try {
    const { planId, returnUrl } = await req.json().catch(() => ({}))
    if (!planId) {
      return new Response('Missing planId', { status: 400, headers: cors })
    }
    if (!returnUrl) {
      return new Response('Missing returnUrl', { status: 400, headers: cors })
    }

    // Client sends plan id, server resolves to Stripe price id via plans.
    const { data: plan } = await admin
      .from('plans')
      .select('stripe_price_id')
      .eq('id', planId)
      .eq('is_active', true)
      .maybeSingle()

    if (!plan?.stripe_price_id) {
      return new Response(`Plan not purchasable: ${planId}`, {
        status: 400,
        headers: cors
      })
    }

    // Get — or create — the Stripe customer for this member.
    const { data: member } = await admin
      .from('members')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    let customerId = member?.stripe_customer_id ?? null

    if (!customerId) {
      const existing = await stripe.customers.list({ email: user.email ?? undefined, limit: 1 })
      const customer =
        existing.data[0] ??
        (await stripe.customers.create({
          email: user.email ?? undefined,
          metadata: { member_id: user.id }
        }))
      customerId = customer.id

      await admin.from('members').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    // Checkout Session in subscription mode still creates a real Subscription
    // object underneath — completing the embedded Payment Element activates
    // it, at which point the webhook fires `customer.subscription.updated`,
    // same as before.
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      ui_mode: 'elements',
      customer: customerId,
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      subscription_data: { metadata: { member_id: user.id } },
      return_url: returnUrl
    })

    if (!session.client_secret) {
      return new Response('No client_secret on Checkout Session', {
        status: 500,
        headers: cors
      })
    }

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...cors, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error(err)
    return new Response('Error creating subscription', { status: 500, headers: cors })
  }
}

if (import.meta.main) {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2026-03-25.dahlia',
    httpClient: Stripe.createFetchHttpClient()
  })

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  Deno.serve((req) =>
    handler(req, {
      admin,
      stripe,
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

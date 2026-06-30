import { assertEquals } from '@std/assert'
import { handler, type Deps } from './index.ts'

type FakeOpts = {
  member?: { stripe_customer_id: string | null; stripe_subscription_id: string | null } | null
  subscription?: any
  upcoming?: any
  plan?: { stripe_price_id: string } | null
}

const DEFAULT_MEMBER = { stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1' }

function makeDeps(opts: FakeOpts = {}) {
  const calls = {
    checkoutSessionsCreate: [] as any[],
    subscriptionsUpdate: [] as any[],
    subscriptionsCancel: [] as any[]
  }

  const member = opts.member === undefined ? DEFAULT_MEMBER : opts.member

  const userClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: member })
        })
      })
    })
  } as any

  const admin = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: opts.plan === undefined ? { stripe_price_id: 'price_1' } : opts.plan
              })
          })
        })
      })
    })
  } as any

  const stripe = {
    subscriptions: {
      retrieve: () =>
        Promise.resolve(
          opts.subscription === undefined
            ? {
                status: 'active',
                cancel_at_period_end: false,
                items: { data: [{ id: 'si_1', current_period_end: 1700000000, price: null }] }
              }
            : opts.subscription
        ),
      update: (id: string, args: any) => {
        calls.subscriptionsUpdate.push({ id, args })
        return Promise.resolve({ id, ...args })
      },
      cancel: (id: string) => {
        calls.subscriptionsCancel.push(id)
        return Promise.resolve({ id, status: 'canceled' })
      }
    },
    invoices: {
      retrieveUpcoming: () =>
        opts.upcoming === undefined
          ? Promise.reject(new Error('no upcoming'))
          : Promise.resolve(opts.upcoming),
      list: () => Promise.resolve({ data: [] })
    },
    paymentMethods: {
      list: () => Promise.resolve({ data: [] }),
      detach: (id: string) => Promise.resolve({ id })
    },
    customers: {
      retrieve: () => Promise.resolve({ deleted: false, invoice_settings: {} }),
      update: (id: string, args: any) => Promise.resolve({ id, ...args })
    },
    checkout: {
      sessions: {
        create: (args: any) => {
          calls.checkoutSessionsCreate.push(args)
          return Promise.resolve({ client_secret: 'cs_secret_setup' })
        }
      }
    }
  } as any

  const deps: Deps = {
    stripe,
    admin,
    getUserClient: () => userClient,
    getUser: () => Promise.resolve({ id: 'user_1' })
  }

  return { deps, calls }
}

function req(body: unknown, headers: Record<string, string> = { Authorization: 'Bearer x' }) {
  return new Request('http://localhost/manage-subscription', {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })
}

Deno.test('returns 401 when no Authorization header is present', async () => {
  const { deps } = makeDeps()
  const res = await handler(req({ action: 'get-subscription' }, {}), deps)
  assertEquals(res.status, 401)
})

Deno.test('returns 401 when getUser resolves null', async () => {
  const { deps } = makeDeps()
  deps.getUser = () => Promise.resolve(null)
  const res = await handler(req({ action: 'get-subscription' }), deps)
  assertEquals(res.status, 401)
})

Deno.test('returns 400 when action is missing', async () => {
  const { deps } = makeDeps()
  const res = await handler(req({}), deps)
  assertEquals(res.status, 400)
})

Deno.test('returns 400 when the member has no Stripe customer', async () => {
  const { deps } = makeDeps({ member: { stripe_customer_id: null, stripe_subscription_id: null } })
  const res = await handler(req({ action: 'get-subscription' }), deps)
  assertEquals(res.status, 400)
  assertEquals(await res.text(), 'No Stripe customer for this member')
})

Deno.test('get-subscription returns null payload for a free member with no subscription', async () => {
  const { deps } = makeDeps({
    member: { stripe_customer_id: 'cus_1', stripe_subscription_id: null }
  })
  const res = await handler(req({ action: 'get-subscription' }), deps)

  assertEquals(res.status, 200)
  assertEquals(await res.json(), null)
})

Deno.test('get-subscription reads currentPeriodEnd off the subscription item, not the top-level object [regression]', async () => {
  // Mirrors the real API-version-bump bug: top-level subscription has no
  // current_period_end field at all (it moved to items.data[0]).
  const { deps } = makeDeps({
    subscription: {
      status: 'active',
      cancel_at_period_end: false,
      items: {
        data: [
          {
            id: 'si_1',
            current_period_end: 1798765432,
            price: { unit_amount: 999, currency: 'usd', recurring: { interval: 'month' } }
          }
        ]
      }
      // intentionally no top-level current_period_end
    }
  })
  const res = await handler(req({ action: 'get-subscription' }), deps)

  assertEquals(res.status, 200)
  const body = await res.json()
  assertEquals(body.currentPeriodEnd, 1798765432)
  assertEquals(body.priceCents, 999)
  assertEquals(body.currency, 'usd')
  assertEquals(body.interval, 'month')
})

Deno.test('get-subscription includes the upcoming invoice when one exists', async () => {
  const { deps } = makeDeps({ upcoming: { amount_due: 500, currency: 'usd' } })
  const res = await handler(req({ action: 'get-subscription' }), deps)

  const body = await res.json()
  assertEquals(body.upcoming, { amountCents: 500, currency: 'usd' })
})

Deno.test('get-subscription sets upcoming to null when retrieveUpcoming rejects', async () => {
  const { deps } = makeDeps()
  const res = await handler(req({ action: 'get-subscription' }), deps)

  const body = await res.json()
  assertEquals(body.upcoming, null)
})

Deno.test('create-setup-intent requires returnUrl', async () => {
  const { deps } = makeDeps()
  const res = await handler(req({ action: 'create-setup-intent' }), deps)
  assertEquals(res.status, 400)
  assertEquals(await res.text(), 'Missing returnUrl')
})

Deno.test('create-setup-intent calls checkout.sessions.create with mode setup, ui_mode elements', async () => {
  const { deps, calls } = makeDeps()
  const res = await handler(
    req({ action: 'create-setup-intent', returnUrl: 'https://app.test' }),
    deps
  )

  assertEquals(res.status, 200)
  assertEquals(calls.checkoutSessionsCreate.length, 1)
  const args = calls.checkoutSessionsCreate[0]
  assertEquals(args.mode, 'setup')
  assertEquals(args.ui_mode, 'elements')
  assertEquals(args.customer, 'cus_1')
  assertEquals(args.return_url, 'https://app.test')
  assertEquals(await res.json(), { clientSecret: 'cs_secret_setup' })
})

Deno.test('change-plan returns 400 when there is no active subscription', async () => {
  const { deps } = makeDeps({
    member: { stripe_customer_id: 'cus_1', stripe_subscription_id: null }
  })
  const res = await handler(req({ action: 'change-plan', planId: 'paid' }), deps)
  assertEquals(res.status, 400)
})

Deno.test('change-plan updates the subscription item with proration always_invoice', async () => {
  const { deps, calls } = makeDeps()
  const res = await handler(req({ action: 'change-plan', planId: 'paid' }), deps)

  assertEquals(res.status, 200)
  assertEquals(calls.subscriptionsUpdate.length, 1)
  assertEquals(calls.subscriptionsUpdate[0].args.proration_behavior, 'always_invoice')
})

Deno.test('cancel with atPeriodEnd true updates cancel_at_period_end instead of canceling immediately', async () => {
  const { deps, calls } = makeDeps()
  const res = await handler(req({ action: 'cancel', atPeriodEnd: true }), deps)

  assertEquals(res.status, 200)
  assertEquals(calls.subscriptionsUpdate.length, 1)
  assertEquals(calls.subscriptionsUpdate[0].args, { cancel_at_period_end: true })
  assertEquals(calls.subscriptionsCancel.length, 0)
})

Deno.test('cancel with atPeriodEnd false cancels the subscription immediately', async () => {
  const { deps, calls } = makeDeps()
  const res = await handler(req({ action: 'cancel', atPeriodEnd: false }), deps)

  assertEquals(res.status, 200)
  assertEquals(calls.subscriptionsCancel, ['sub_1'])
})

Deno.test('resume clears cancel_at_period_end', async () => {
  const { deps, calls } = makeDeps()
  const res = await handler(req({ action: 'resume' }), deps)

  assertEquals(res.status, 200)
  assertEquals(calls.subscriptionsUpdate[0].args, { cancel_at_period_end: false })
})

Deno.test('returns 500 with the Stripe error message when Stripe throws', async () => {
  const { deps } = makeDeps()
  deps.stripe.subscriptions.retrieve = () => Promise.reject(new Error('stripe down'))
  const res = await handler(req({ action: 'get-subscription' }), deps)

  assertEquals(res.status, 500)
  assertEquals(await res.text(), 'stripe down')
})

Deno.test('returns 400 Unknown action for an unrecognized action', async () => {
  const { deps } = makeDeps()
  const res = await handler(req({ action: 'not-a-real-action' }), deps)
  assertEquals(res.status, 400)
  assertEquals(await res.text(), 'Unknown action')
})

Deno.test('responds 204 to OPTIONS preflight', async () => {
  const { deps } = makeDeps()
  const res = await handler(
    new Request('http://localhost/manage-subscription', { method: 'OPTIONS' }),
    deps
  )
  assertEquals(res.status, 204)
})

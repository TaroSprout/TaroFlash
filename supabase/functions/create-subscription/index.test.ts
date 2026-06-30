import { assertEquals } from '@std/assert'
import { handler, type Deps } from './index.ts'

type FakeOpts = {
  plan?: { stripe_price_id: string } | null
  member?: { stripe_customer_id: string | null } | null
  existingCustomers?: { id: string }[]
  sessionClientSecret?: string | null
}

function makeDeps(opts: FakeOpts = {}) {
  const calls = {
    checkoutSessionsCreate: [] as any[],
    customersCreate: [] as any[],
    membersUpdate: [] as any[]
  }

  const admin = {
    from: (table: string) => {
      if (table === 'plans') {
        return {
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
        }
      }
      // members
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: opts.member === undefined ? { stripe_customer_id: 'cus_1' } : opts.member
              })
          })
        }),
        update: (vals: any) => ({
          eq: () => {
            calls.membersUpdate.push(vals)
            return Promise.resolve({ data: null, error: null })
          }
        })
      }
    }
  } as any

  const stripe = {
    customers: {
      list: () => Promise.resolve({ data: opts.existingCustomers ?? [] }),
      create: (args: any) => {
        calls.customersCreate.push(args)
        return Promise.resolve({ id: 'cus_new' })
      }
    },
    checkout: {
      sessions: {
        create: (args: any) => {
          calls.checkoutSessionsCreate.push(args)
          return Promise.resolve({
            client_secret:
              opts.sessionClientSecret === undefined ? 'cs_secret_1' : opts.sessionClientSecret
          })
        }
      }
    }
  } as any

  const deps: Deps = {
    admin,
    stripe,
    getUser: () => Promise.resolve({ id: 'user_1', email: 'a@b.com' })
  }

  return { deps, calls }
}

function req(body: unknown, headers: Record<string, string> = { Authorization: 'Bearer x' }) {
  return new Request('http://localhost/create-subscription', {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })
}

Deno.test('returns 401 when no Authorization header is present', async () => {
  const { deps } = makeDeps()
  const res = await handler(req({ planId: 'paid', returnUrl: 'https://app.test' }, {}), deps)
  assertEquals(res.status, 401)
})

Deno.test('returns 401 when getUser resolves null', async () => {
  const { deps } = makeDeps()
  deps.getUser = () => Promise.resolve(null)
  const res = await handler(req({ planId: 'paid', returnUrl: 'https://app.test' }), deps)
  assertEquals(res.status, 401)
})

Deno.test('returns 400 Missing planId when planId is absent', async () => {
  const { deps } = makeDeps()
  const res = await handler(req({ returnUrl: 'https://app.test' }), deps)
  assertEquals(res.status, 400)
  assertEquals(await res.text(), 'Missing planId')
})

Deno.test('returns 400 Missing returnUrl when returnUrl is absent', async () => {
  const { deps } = makeDeps()
  const res = await handler(req({ planId: 'paid' }), deps)
  assertEquals(res.status, 400)
  assertEquals(await res.text(), 'Missing returnUrl')
})

Deno.test('creates the Checkout Session in subscription mode with ui_mode elements', async () => {
  const { deps, calls } = makeDeps()
  const res = await handler(req({ planId: 'paid', returnUrl: 'https://app.test' }), deps)

  assertEquals(res.status, 200)
  assertEquals(calls.checkoutSessionsCreate.length, 1)
  const args = calls.checkoutSessionsCreate[0]
  assertEquals(args.mode, 'subscription')
  assertEquals(args.ui_mode, 'elements')
  assertEquals(args.customer, 'cus_1')
  assertEquals(args.return_url, 'https://app.test')
  assertEquals(args.line_items, [{ price: 'price_1', quantity: 1 }])
})

Deno.test('response body is { clientSecret } only — no subscriptionId', async () => {
  const { deps } = makeDeps()
  const res = await handler(req({ planId: 'paid', returnUrl: 'https://app.test' }), deps)

  const body = await res.json()
  assertEquals(body, { clientSecret: 'cs_secret_1' })
  assertEquals('subscriptionId' in body, false)
})

Deno.test('creates a new Stripe customer when the member has none, persists the id', async () => {
  const { deps, calls } = makeDeps({ member: { stripe_customer_id: null } })
  const res = await handler(req({ planId: 'paid', returnUrl: 'https://app.test' }), deps)

  assertEquals(res.status, 200)
  assertEquals(calls.customersCreate.length, 1)
  assertEquals(calls.membersUpdate, [{ stripe_customer_id: 'cus_new' }])
})

Deno.test('reuses an existing Stripe customer found by email instead of creating one', async () => {
  const { deps, calls } = makeDeps({
    member: { stripe_customer_id: null },
    existingCustomers: [{ id: 'cus_existing' }]
  })
  const res = await handler(req({ planId: 'paid', returnUrl: 'https://app.test' }), deps)

  assertEquals(res.status, 200)
  assertEquals(calls.customersCreate.length, 0)
  assertEquals(calls.membersUpdate, [{ stripe_customer_id: 'cus_existing' }])
})

Deno.test('returns 400 when the plan is not purchasable', async () => {
  const { deps } = makeDeps({ plan: null })
  const res = await handler(req({ planId: 'free', returnUrl: 'https://app.test' }), deps)

  assertEquals(res.status, 400)
  assertEquals(await res.text(), 'Plan not purchasable: free')
})

Deno.test('returns 500 when the Checkout Session has no client_secret', async () => {
  const { deps } = makeDeps({ sessionClientSecret: null })
  const res = await handler(req({ planId: 'paid', returnUrl: 'https://app.test' }), deps)

  assertEquals(res.status, 500)
})

Deno.test('returns 500 with a generic message when Stripe throws', async () => {
  const { deps } = makeDeps()
  deps.stripe.checkout.sessions.create = () => Promise.reject(new Error('stripe down'))
  const res = await handler(req({ planId: 'paid', returnUrl: 'https://app.test' }), deps)

  assertEquals(res.status, 500)
  assertEquals(await res.text(), 'Error creating subscription')
})

Deno.test('responds 204 to OPTIONS preflight', async () => {
  const { deps } = makeDeps()
  const res = await handler(
    new Request('http://localhost/create-subscription', { method: 'OPTIONS' }),
    deps
  )
  assertEquals(res.status, 204)
})

Deno.test('responds 405 to non-POST methods', async () => {
  const { deps } = makeDeps()
  const res = await handler(
    new Request('http://localhost/create-subscription', { method: 'GET' }),
    deps
  )
  assertEquals(res.status, 405)
})

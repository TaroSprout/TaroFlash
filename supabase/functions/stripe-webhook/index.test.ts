import { assertEquals, assertStringIncludes } from '@std/assert'
import { handler, type Deps } from './index.ts'
import { STRIPE_API_VERSION } from '../_shared/stripe.ts'

type FakeOpts = {
  // members.update(...).eq(...).select('id').maybeSingle() result
  updatedMember?: { id: string } | null
  // members.select(...).eq(...).maybeSingle() result (refundIfPendingDeletion)
  deleteState?: {
    id: string
    delete_at: string | null
    stripe_subscription_id: string | null
  } | null
  // plans.select('id').eq(...).single() result
  planRow?: { id: string } | null
  invoice?: any
  rpcError?: { message: string } | null
}

const DEFAULT_MEMBER = { id: 'member_1' }
const DEFAULT_PLAN = { id: 'paid' }
const DEFAULT_INVOICE = {
  id: 'in_1',
  amount_paid: 1000,
  currency: 'usd',
  post_payment_credit_notes_amount: 0
}

function makeDeps(opts: FakeOpts = {}) {
  const calls = {
    membersUpdate: [] as any[],
    rpc: [] as { fn: string; args: any }[],
    subscriptionsCancel: [] as string[],
    invoicesRetrieve: [] as string[],
    creditNotesCreate: [] as any[]
  }

  const updatedMember = opts.updatedMember === undefined ? DEFAULT_MEMBER : opts.updatedMember
  const planRow = opts.planRow === undefined ? DEFAULT_PLAN : opts.planRow

  const supabase = {
    from: (table: string) => {
      if (table === 'plans') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: planRow,
                  error: planRow ? null : { message: 'no matching plan' }
                })
            })
          })
        }
      }
      // members
      return {
        update: (vals: any) => {
          calls.membersUpdate.push(vals)
          return {
            eq: () => ({
              select: () => ({
                maybeSingle: () => Promise.resolve({ data: updatedMember, error: null })
              })
            })
          }
        },
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: opts.deleteState === undefined ? null : opts.deleteState,
                error: null
              })
          })
        })
      }
    },
    rpc: (fn: string, args: any) => {
      calls.rpc.push({ fn, args })
      return Promise.resolve({ error: opts.rpcError ?? null })
    }
  } as any

  const stripe = {
    webhooks: {
      constructEventAsync: (body: string) => Promise.resolve(JSON.parse(body))
    },
    subscriptions: {
      cancel: (id: string) => {
        calls.subscriptionsCancel.push(id)
        return Promise.resolve({ id, status: 'canceled' })
      }
    },
    invoices: {
      retrieve: (id: string) => {
        calls.invoicesRetrieve.push(id)
        return Promise.resolve(
          opts.invoice === undefined ? { ...DEFAULT_INVOICE, id } : opts.invoice
        )
      }
    },
    creditNotes: {
      create: (args: any) => {
        calls.creditNotesCreate.push(args)
        return Promise.resolve({ id: 'cn_1' })
      }
    }
  } as any

  const deps: Deps = {
    stripe,
    supabase,
    cryptoProvider: {} as any,
    webhookSecret: 'whsec_test'
  }

  return { deps, calls }
}

function subscriptionEvent(type: string, overrides: Record<string, unknown> = {}) {
  return {
    type,
    api_version: STRIPE_API_VERSION,
    data: {
      object: {
        customer: 'cus_1',
        status: 'active',
        id: 'sub_1',
        items: { data: [{ price: { id: 'price_1' } }] },
        ...overrides
      }
    }
  }
}

function req(event: unknown, headers: Record<string, string> = { 'stripe-signature': 'sig_test' }) {
  return new Request('http://localhost/stripe-webhook', {
    method: 'POST',
    headers,
    body: JSON.stringify(event)
  })
}

Deno.test('returns 405 for a non-POST request', async () => {
  const { deps } = makeDeps()
  const res = await handler(new Request('http://localhost/stripe-webhook', { method: 'GET' }), deps)
  assertEquals(res.status, 405)
})

Deno.test('returns 400 when the stripe-signature header is missing', async () => {
  const { deps } = makeDeps()
  const res = await handler(req(subscriptionEvent('customer.subscription.updated'), {}), deps)
  assertEquals(res.status, 400)
  assertEquals(await res.text(), 'Missing stripe-signature header')
})

Deno.test('returns 400 Invalid signature when constructEventAsync rejects', async () => {
  const { deps } = makeDeps()
  deps.stripe.webhooks.constructEventAsync = () => Promise.reject(new Error('bad signature'))
  const res = await handler(req(subscriptionEvent('customer.subscription.updated')), deps)
  assertEquals(res.status, 400)
  assertStringIncludes(await res.text(), 'Invalid signature:')
})

Deno.test('customer.subscription.deleted (markFree) calls begin_downgrade_grace(member.id) [obligation]', async () => {
  const { deps, calls } = makeDeps()
  const res = await handler(req(subscriptionEvent('customer.subscription.deleted')), deps)

  assertEquals(res.status, 200)
  assertEquals(calls.membersUpdate, [{ plan: 'free', stripe_subscription_id: null }])
  assertEquals(calls.rpc, [{ fn: 'begin_downgrade_grace', args: { p_member_id: 'member_1' } }])
})

Deno.test('active syncSubscription (upgrade) calls clear_downgrade_grace(member.id) [obligation]', async () => {
  const { deps, calls } = makeDeps()
  const res = await handler(
    req(subscriptionEvent('customer.subscription.updated', { status: 'active' })),
    deps
  )

  assertEquals(res.status, 200)
  assertEquals(calls.membersUpdate, [{ plan: 'paid', stripe_subscription_id: 'sub_1' }])
  assertEquals(calls.rpc, [{ fn: 'clear_downgrade_grace', args: { p_member_id: 'member_1' } }])
})

Deno.test('an inactive syncSubscription (not active/trialing) also calls begin_downgrade_grace', async () => {
  const { deps, calls } = makeDeps()
  const res = await handler(
    req(subscriptionEvent('customer.subscription.updated', { status: 'canceled' })),
    deps
  )

  assertEquals(res.status, 200)
  assertEquals(calls.membersUpdate, [{ plan: 'free', stripe_subscription_id: null }])
  assertEquals(calls.rpc, [{ fn: 'begin_downgrade_grace', args: { p_member_id: 'member_1' } }])
})

Deno.test('no plan matching the price_id skips the members update and the downgrade-grace reconcile', async () => {
  const { deps, calls } = makeDeps({ planRow: null })
  const res = await handler(req(subscriptionEvent('customer.subscription.updated')), deps)

  assertEquals(res.status, 200)
  assertEquals(calls.membersUpdate.length, 0)
  assertEquals(calls.rpc.length, 0)
})

Deno.test('no matching member row skips the downgrade-grace reconcile', async () => {
  const { deps, calls } = makeDeps({ updatedMember: null })
  const res = await handler(req(subscriptionEvent('customer.subscription.deleted')), deps)

  assertEquals(res.status, 200)
  assertEquals(calls.membersUpdate.length, 1)
  assertEquals(calls.rpc.length, 0)
})

Deno.test('invoice.payment_succeeded refunds and re-cancels when the member is pending deletion', async () => {
  const { deps, calls } = makeDeps({
    deleteState: {
      id: 'member_1',
      delete_at: '2026-01-01T00:00:00Z',
      stripe_subscription_id: 'sub_1'
    }
  })
  const res = await handler(
    req({
      type: 'invoice.payment_succeeded',
      api_version: STRIPE_API_VERSION,
      data: { object: { customer: 'cus_1', id: 'in_1' } }
    }),
    deps
  )

  assertEquals(res.status, 200)
  assertEquals(calls.invoicesRetrieve, ['in_1'])
  assertEquals(calls.creditNotesCreate.length, 1)
  assertEquals(calls.subscriptionsCancel, ['sub_1'])
})

Deno.test('invoice.payment_succeeded is a no-op for a live (non-pending-deletion) account', async () => {
  const { deps, calls } = makeDeps({ deleteState: null })
  const res = await handler(
    req({
      type: 'invoice.payment_succeeded',
      api_version: STRIPE_API_VERSION,
      data: { object: { customer: 'cus_1', id: 'in_1' } }
    }),
    deps
  )

  assertEquals(res.status, 200)
  assertEquals(calls.invoicesRetrieve.length, 0)
  assertEquals(calls.subscriptionsCancel.length, 0)
})

Deno.test('an unhandled event type acks 200 with no side effects', async () => {
  const { deps, calls } = makeDeps()
  const res = await handler(
    req({
      type: 'checkout.session.completed',
      api_version: STRIPE_API_VERSION,
      data: { object: {} }
    }),
    deps
  )

  assertEquals(res.status, 200)
  assertEquals(await res.json(), { received: true })
  assertEquals(calls.rpc.length, 0)
  assertEquals(calls.membersUpdate.length, 0)
})

Deno.test('returns 500 Handler error when the downstream RPC throws', async () => {
  const { deps } = makeDeps({ rpcError: { message: 'rpc boom' } })
  const res = await handler(req(subscriptionEvent('customer.subscription.deleted')), deps)

  assertEquals(res.status, 500)
  assertEquals(await res.text(), 'Handler error')
})

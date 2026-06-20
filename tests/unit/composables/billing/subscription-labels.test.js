import { describe, test, expect, vi, afterEach } from 'vite-plus/test'
import { createApp, ref } from 'vue'
import { createI18n } from 'vue-i18n'
import messages from '@intlify/unplugin-vue-i18n/messages'

vi.mock('@/utils/billing', () => ({
  formatMoney: (cents, currency, _locale) =>
    `${currency.toUpperCase()} ${(cents / 100).toFixed(2)}`,
  formatStripeDate: (seconds, _locale) => `date:${seconds}`
}))

import { useSubscriptionLabels } from '@/composables/billing/subscription-labels'

// ── Helpers ───────────────────────────────────────────────────────────────────

let app = null

function withSetup(composable) {
  let result
  app = createApp({
    setup() {
      result = composable()
      return () => null
    }
  })
  const i18n = createI18n({ locale: 'en-us', legacy: false, messages })
  app.use(i18n)
  app.mount(document.createElement('div'))
  return result
}

afterEach(() => {
  app?.unmount()
  app = null
})

function makeQuery(data = null) {
  const d = ref(data)
  return { data: d }
}

const activeSubscription = {
  priceCents: 1000,
  currency: 'usd',
  interval: 'month',
  status: 'active',
  currentPeriodEnd: 1800000000,
  cancelAtPeriodEnd: false,
  upcoming: null
}

// ── subscription ref ──────────────────────────────────────────────────────────

describe('useSubscriptionLabels — subscription', () => {
  test('returns null when query data is null (free member) [obligation]', () => {
    const query = makeQuery(null)
    const { subscription } = withSetup(() => useSubscriptionLabels(query))
    expect(subscription.value).toBeNull()
  })

  test('returns the DTO when query data is present', () => {
    const query = makeQuery(activeSubscription)
    const { subscription } = withSetup(() => useSubscriptionLabels(query))
    expect(subscription.value).toEqual(activeSubscription)
  })
})

// ── status label ──────────────────────────────────────────────────────────────

describe('useSubscriptionLabels — status', () => {
  test('returns null when no subscription (free member) [obligation]', () => {
    const { status } = withSetup(() => useSubscriptionLabels(makeQuery(null)))
    expect(status.value).toBeNull()
  })

  test('returns "Active" for status=active non-canceling sub [obligation]', () => {
    const { status } = withSetup(() => useSubscriptionLabels(makeQuery(activeSubscription)))
    expect(status.value).toBe('Active')
  })

  test('returns "Canceled" when cancelAtPeriodEnd=true even with status=active [obligation]', () => {
    const sub = { ...activeSubscription, cancelAtPeriodEnd: true }
    const { status } = withSetup(() => useSubscriptionLabels(makeQuery(sub)))
    expect(status.value).toBe('Canceled')
  })

  test('status and description are returned as SEPARATE refs, not joined [obligation]', () => {
    const { status, description } = withSetup(() =>
      useSubscriptionLabels(makeQuery(activeSubscription))
    )
    expect(typeof status.value).toBe('string')
    expect(typeof description.value).toBe('string')
    expect(status.value).not.toContain('Renews')
    expect(description.value).not.toContain('Active')
  })
})

// ── description label ─────────────────────────────────────────────────────────

describe('useSubscriptionLabels — description', () => {
  test('returns null when no subscription [obligation]', () => {
    const { description } = withSetup(() => useSubscriptionLabels(makeQuery(null)))
    expect(description.value).toBeNull()
  })

  test('returns ends-on when cancelAtPeriodEnd=true [obligation]', () => {
    const sub = { ...activeSubscription, cancelAtPeriodEnd: true }
    const { description } = withSetup(() => useSubscriptionLabels(makeQuery(sub)))
    expect(description.value).toMatch(/Ends/)
  })

  test('description for canceling sub is "Ends {date}", NOT "Renews" [obligation]', () => {
    const sub = { ...activeSubscription, cancelAtPeriodEnd: true }
    const { description } = withSetup(() => useSubscriptionLabels(makeQuery(sub)))
    expect(description.value).not.toMatch(/Renews/)
    expect(description.value).toMatch(/Ends/)
  })

  test('returns renews-on when non-canceling and no upcoming', () => {
    const { description } = withSetup(() => useSubscriptionLabels(makeQuery(activeSubscription)))
    expect(description.value).toMatch(/Renews/)
  })

  test('returns upcoming-charge when upcoming is set', () => {
    const sub = { ...activeSubscription, upcoming: { amountCents: 999, currency: 'usd' } }
    const { description } = withSetup(() => useSubscriptionLabels(makeQuery(sub)))
    expect(description.value).toMatch(/Next charge/)
  })
})

// ── cost label ────────────────────────────────────────────────────────────────

describe('useSubscriptionLabels — cost', () => {
  test('returns null when no subscription [obligation]', () => {
    const { cost } = withSetup(() => useSubscriptionLabels(makeQuery(null)))
    expect(cost.value).toBeNull()
  })

  test('returns null when priceCents is null [obligation]', () => {
    const sub = { ...activeSubscription, priceCents: null }
    const { cost } = withSetup(() => useSubscriptionLabels(makeQuery(sub)))
    expect(cost.value).toBeNull()
  })

  test('builds cost from flat DTO priceCents/currency/interval [obligation]', () => {
    const { cost } = withSetup(() => useSubscriptionLabels(makeQuery(activeSubscription)))
    expect(cost.value).toContain('10.00')
    expect(cost.value).toContain('month')
  })

  test('omits interval separator when sub.interval is null', () => {
    const sub = { ...activeSubscription, interval: null }
    const { cost } = withSetup(() => useSubscriptionLabels(makeQuery(sub)))
    expect(cost.value).not.toBeNull()
    expect(cost.value).not.toContain('null')
  })
})

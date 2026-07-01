import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp } from 'vue'
import { settingsRecedeKey } from '@/components/settings/layout'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockOnUpgrade } = vi.hoisted(() => ({ mockOnUpgrade: vi.fn() }))

vi.mock('@/composables/member/subscription-actions', () => ({
  useSubscriptionActions: () => ({
    onUpgrade: mockOnUpgrade,
    onCancel: vi.fn(),
    onResume: vi.fn(),
    canceling: { value: false },
    resuming: { value: false }
  })
}))

import { useUpgradeClick } from '@/components/settings/tab-subscription/use-upgrade-click'

// ── Setup ─────────────────────────────────────────────────────────────────────

let app = null

function withSetup(composable, recede) {
  let result
  app = createApp({
    setup() {
      result = composable()
      return () => null
    }
  })
  if (recede) app.provide(settingsRecedeKey, recede)
  app.mount(document.createElement('div'))
  return result
}

afterEach(() => {
  app?.unmount()
  app = null
})

beforeEach(() => {
  mockOnUpgrade.mockReset()
})

// ── recede/restore choreography ────────────────────────────────────────────────

describe('useUpgradeClick', () => {
  test('[obligation] calls recede() before opening Checkout and restore() after it resolves (upgrade path)', async () => {
    const order = []
    const recede = {
      recede: vi.fn(() => order.push('recede')),
      restore: vi.fn(() => order.push('restore'))
    }
    mockOnUpgrade.mockImplementation(async () => {
      order.push('checkout-open')
    })
    const { onUpgradeClick } = withSetup(() => useUpgradeClick(), recede)

    await onUpgradeClick()

    expect(order).toEqual(['recede', 'checkout-open', 'restore'])
  })

  test('[obligation] still restores after a cancelled/backed-out checkout', async () => {
    const order = []
    const recede = {
      recede: vi.fn(() => order.push('recede')),
      restore: vi.fn(() => order.push('restore'))
    }
    // onUpgrade resolves normally even when the member backs out — the
    // modal's response promise always settles, upgraded or not.
    mockOnUpgrade.mockImplementation(async () => {
      order.push('checkout-cancelled')
    })
    const { onUpgradeClick } = withSetup(() => useUpgradeClick(), recede)

    await onUpgradeClick()

    expect(recede.restore).toHaveBeenCalledOnce()
    expect(order).toEqual(['recede', 'checkout-cancelled', 'restore'])
  })

  test('is a no-op guard when no recede is injected (no ancestor settings modal)', async () => {
    mockOnUpgrade.mockResolvedValue(undefined)
    const { onUpgradeClick } = withSetup(() => useUpgradeClick())

    await expect(onUpgradeClick()).resolves.toBeUndefined()
    expect(mockOnUpgrade).toHaveBeenCalledOnce()
  })

  test('forwards onCancel, onResume, canceling, resuming from useSubscriptionActions', () => {
    const result = withSetup(() => useUpgradeClick())
    expect(result.onCancel).toBeTypeOf('function')
    expect(result.onResume).toBeTypeOf('function')
    expect(result.canceling.value).toBe(false)
    expect(result.resuming.value).toBe(false)
  })
})

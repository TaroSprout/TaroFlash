import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp } from 'vue'

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

import { useUpgradeClick } from '@/views/settings/tab-subscription/use-upgrade-click'

// ── Setup ─────────────────────────────────────────────────────────────────────

let app = null

function withSetup(composable) {
  let result
  app = createApp({
    setup() {
      result = composable()
      return () => null
    }
  })
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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useUpgradeClick', () => {
  test('onUpgradeClick delegates to useSubscriptionActions().onUpgrade', async () => {
    mockOnUpgrade.mockResolvedValue(undefined)
    const { onUpgradeClick } = withSetup(() => useUpgradeClick())

    await onUpgradeClick()

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

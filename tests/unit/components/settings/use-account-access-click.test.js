import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/composables/settings/use-account-access-modal', () => ({
  useAccountAccessModal: () => ({ open: mockOpen })
}))

import { useAccountAccessClick } from '@/views/settings/use-account-access-click'

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
  mockOpen.mockReset()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useAccountAccessClick', () => {
  test('onAccountAccessClick opens the account-access modal and awaits its response', async () => {
    mockOpen.mockReturnValueOnce({ response: Promise.resolve(undefined) })
    const { onAccountAccessClick } = withSetup(() => useAccountAccessClick())

    await expect(onAccountAccessClick()).resolves.toBeUndefined()
    expect(mockOpen).toHaveBeenCalledOnce()
  })
})

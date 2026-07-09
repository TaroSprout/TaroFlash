import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp } from 'vue'
import { settingsRecedeKey } from '@/views/settings/layout'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/composables/settings/use-account-access-modal', () => ({
  useAccountAccessModal: () => ({ open: mockOpen })
}))

import { useAccountAccessClick } from '@/views/settings/use-account-access-click'

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
  mockOpen.mockReset()
})

// ── recede/restore choreography ────────────────────────────────────────────────

describe('useAccountAccessClick', () => {
  test('[obligation] calls recede() before opening the modal and restore() after its response resolves', async () => {
    const order = []
    const recede = {
      recede: vi.fn(() => order.push('recede')),
      restore: vi.fn(() => order.push('restore'))
    }
    let resolveResponse
    mockOpen.mockReturnValueOnce({
      response: new Promise((resolve) => {
        resolveResponse = () => {
          order.push('modal-response')
          resolve(undefined)
        }
      })
    })
    const { onAccountAccessClick } = withSetup(() => useAccountAccessClick(), recede)

    const clickPromise = onAccountAccessClick()
    expect(order).toEqual(['recede'])

    resolveResponse()
    await clickPromise

    expect(order).toEqual(['recede', 'modal-response', 'restore'])
  })

  test('is a no-op guard when no recede is injected (no ancestor settings modal)', async () => {
    mockOpen.mockReturnValueOnce({ response: Promise.resolve(undefined) })
    const { onAccountAccessClick } = withSetup(() => useAccountAccessClick())

    await expect(onAccountAccessClick()).resolves.toBeUndefined()
    expect(mockOpen).toHaveBeenCalledOnce()
  })
})

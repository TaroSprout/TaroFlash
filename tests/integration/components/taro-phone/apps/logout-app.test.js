import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import LogoutApp from '@/components/taro-phone/apps/logout-app.vue'

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: () => ({ value: false })
}))

// alertResponse holds a resolve fn so each test controls whether the user
// confirms or cancels the logout alert.
const { mockAlertWarn, mockLogout, alertResponse } = vi.hoisted(() => {
  let _resolve = null
  const alertResponse = {
    resolve: (val) => _resolve?.(val),
    _setResolve: (fn) => {
      _resolve = fn
    }
  }
  return { mockAlertWarn: vi.fn(), mockLogout: vi.fn(), alertResponse }
})

vi.mock('@/composables/alert', () => ({
  useAlert: () => ({ warn: mockAlertWarn })
}))

vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({ logout: mockLogout })
}))

function makeWrapper() {
  return mount(LogoutApp)
}

beforeEach(() => {
  mockAlertWarn.mockReset()
  mockLogout.mockReset()
  mockAlertWarn.mockImplementation(() => ({
    response: new Promise((resolve) => alertResponse._setResolve(resolve))
  }))
})

describe('LogoutApp — confirm flow [obligation]', () => {
  test('clicking shows a confirm alert', async () => {
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="phone-app"]').trigger('click')
    expect(mockAlertWarn).toHaveBeenCalledOnce()
  })

  test('confirming the alert calls session.logout()', async () => {
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="phone-app"]').trigger('click')

    alertResponse.resolve(true)
    await flushPromises()

    expect(mockLogout).toHaveBeenCalledOnce()
  })

  test('cancelling the alert does not call session.logout()', async () => {
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="phone-app"]').trigger('click')

    alertResponse.resolve(false)
    await flushPromises()

    expect(mockLogout).not.toHaveBeenCalled()
  })
})

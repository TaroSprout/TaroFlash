import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  push: vi.fn(),
  consumeOAuthPopupFlag: vi.fn()
}))

vi.mock('@/supabase-client', () => ({
  supabase: { auth: { getSession: mocks.getSession } }
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push })
}))

vi.mock('@/api/session', () => ({
  consumeOAuthPopupFlag: mocks.consumeOAuthPopupFlag
}))

import Callback from '@/views/auth/callback.vue'

describe('auth/callback', () => {
  let closeSpy

  beforeEach(() => {
    mocks.getSession.mockReset()
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
    mocks.push.mockReset()
    mocks.consumeOAuthPopupFlag.mockReset()
    closeSpy = vi.spyOn(window, 'close').mockImplementation(() => {})
  })

  afterEach(() => {
    closeSpy.mockRestore()
  })

  test('awaits getSession on mount', async () => {
    mocks.consumeOAuthPopupFlag.mockReturnValue(false)
    mount(Callback)
    await flushPromises()
    expect(mocks.getSession).toHaveBeenCalledTimes(1)
  })

  test('closes the window and does not navigate when consumeOAuthPopupFlag returns true [obligation]', async () => {
    mocks.consumeOAuthPopupFlag.mockReturnValue(true)
    mount(Callback)
    await flushPromises()
    expect(closeSpy).toHaveBeenCalledTimes(1)
    expect(mocks.push).not.toHaveBeenCalled()
  })

  test('navigates to the dashboard when consumeOAuthPopupFlag returns false [obligation]', async () => {
    mocks.consumeOAuthPopupFlag.mockReturnValue(false)
    mount(Callback)
    await flushPromises()
    expect(mocks.push).toHaveBeenCalledWith({ name: 'dashboard' })
    expect(closeSpy).not.toHaveBeenCalled()
  })
})

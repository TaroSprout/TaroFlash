import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  push: vi.fn(),
  consumeOAuthPopupFlag: vi.fn(),
  consumeReturnDestination: vi.fn(),
  isNewAccountSession: vi.fn(),
  trackSignupCompleted: vi.fn()
}))

vi.mock('@/supabase-client', () => ({
  supabase: { auth: { getSession: mocks.getSession } }
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push })
}))

vi.mock('@/api/session', () => ({
  consumeOAuthPopupFlag: mocks.consumeOAuthPopupFlag,
  isNewAccountSession: mocks.isNewAccountSession
}))

vi.mock('@/composables/auth/return-destination', () => ({
  consumeReturnDestination: mocks.consumeReturnDestination
}))

vi.mock('@/composables/tracking', () => ({
  useTracking: () => ({ trackSignupCompleted: mocks.trackSignupCompleted })
}))

import Callback from '@/views/auth/callback.vue'

describe('auth/callback', () => {
  let closeSpy

  beforeEach(() => {
    mocks.getSession.mockReset()
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
    mocks.push.mockReset()
    mocks.consumeOAuthPopupFlag.mockReset()
    mocks.consumeReturnDestination.mockReset().mockReturnValue(null)
    mocks.isNewAccountSession.mockReset().mockResolvedValue(false)
    mocks.trackSignupCompleted.mockReset()
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

  test('navigates to the dashboard when consumeOAuthPopupFlag returns false and no destination was captured [obligation]', async () => {
    mocks.consumeOAuthPopupFlag.mockReturnValue(false)
    mocks.consumeReturnDestination.mockReturnValue(null)
    mount(Callback)
    await flushPromises()
    expect(mocks.push).toHaveBeenCalledWith({ name: 'dashboard' })
    expect(closeSpy).not.toHaveBeenCalled()
  })

  // [obligation] a full-redirect OAuth round trip lands on the destination
  // stashed before the redirect, not always the dashboard.
  test('navigates to the consumed return destination when one was captured [obligation]', async () => {
    mocks.consumeOAuthPopupFlag.mockReturnValue(false)
    mocks.consumeReturnDestination.mockReturnValue('/deck/123')
    mount(Callback)
    await flushPromises()
    expect(mocks.push).toHaveBeenCalledWith('/deck/123')
    expect(mocks.push).not.toHaveBeenCalledWith({ name: 'dashboard' })
  })

  test('does not consume the return destination when the popup flow closes the window [obligation]', async () => {
    mocks.consumeOAuthPopupFlag.mockReturnValue(true)
    mount(Callback)
    await flushPromises()
    expect(mocks.consumeReturnDestination).not.toHaveBeenCalled()
  })

  test('popup leg never checks isNewAccountSession or fires Signup Completed — the opener owns that [obligation]', async () => {
    mocks.consumeOAuthPopupFlag.mockReturnValue(true)
    mocks.isNewAccountSession.mockResolvedValue(true)
    mount(Callback)
    await flushPromises()
    expect(mocks.isNewAccountSession).not.toHaveBeenCalled()
    expect(mocks.trackSignupCompleted).not.toHaveBeenCalled()
  })

  test('redirect leg fires Signup Completed when isNewAccountSession() resolves true [obligation]', async () => {
    mocks.consumeOAuthPopupFlag.mockReturnValue(false)
    mocks.isNewAccountSession.mockResolvedValue(true)
    mount(Callback)
    await flushPromises()
    expect(mocks.trackSignupCompleted).toHaveBeenCalledOnce()
  })

  test('redirect leg does NOT fire Signup Completed when isNewAccountSession() resolves false — a returning account [obligation]', async () => {
    mocks.consumeOAuthPopupFlag.mockReturnValue(false)
    mocks.isNewAccountSession.mockResolvedValue(false)
    mount(Callback)
    await flushPromises()
    expect(mocks.trackSignupCompleted).not.toHaveBeenCalled()
  })
})

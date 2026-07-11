import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  push: vi.fn()
}))

vi.mock('@/supabase-client', () => ({
  supabase: { auth: { getSession: mocks.getSession } }
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push })
}))

import Callback from '@/views/auth/callback.vue'

function setWindowName(value) {
  Object.defineProperty(window, 'name', {
    configurable: true,
    value
  })
}

function setOpener(value) {
  Object.defineProperty(window, 'opener', {
    configurable: true,
    get: () => value
  })
}

describe('auth/callback', () => {
  let closeSpy
  let originalNameDescriptor
  let originalOpenerDescriptor

  beforeEach(() => {
    mocks.getSession.mockReset()
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
    mocks.push.mockReset()
    originalNameDescriptor = Object.getOwnPropertyDescriptor(window, 'name')
    originalOpenerDescriptor = Object.getOwnPropertyDescriptor(window, 'opener')
    closeSpy = vi.spyOn(window, 'close').mockImplementation(() => {})
  })

  afterEach(() => {
    closeSpy.mockRestore()
    if (originalNameDescriptor) {
      Object.defineProperty(window, 'name', originalNameDescriptor)
    } else {
      setWindowName('')
    }
    if (originalOpenerDescriptor) {
      Object.defineProperty(window, 'opener', originalOpenerDescriptor)
    } else {
      try {
        // eslint-disable-next-line no-self-assign
        delete window.opener
      } catch {
        setOpener(null)
      }
    }
  })

  test('awaits getSession on mount', async () => {
    setWindowName('')
    mount(Callback)
    await flushPromises()
    expect(mocks.getSession).toHaveBeenCalledTimes(1)
  })

  test('pushes to the dashboard route when window.name is not oauthFlow', async () => {
    setWindowName('')
    mount(Callback)
    await flushPromises()
    expect(mocks.push).toHaveBeenCalledWith({ name: 'dashboard' })
    expect(closeSpy).not.toHaveBeenCalled()
  })

  test('closes the window and does not navigate when window.name is oauthFlow, even with opener severed by COOP [obligation]', async () => {
    setWindowName('oauthFlow')
    setOpener(null)
    mount(Callback)
    await flushPromises()
    expect(closeSpy).toHaveBeenCalledTimes(1)
    expect(mocks.push).not.toHaveBeenCalled()
  })

  test('navigates to the dashboard for a plain full-page redirect (window.name unset, no popup) [obligation]', async () => {
    setWindowName('')
    setOpener(null)
    mount(Callback)
    await flushPromises()
    expect(mocks.push).toHaveBeenCalledWith({ name: 'dashboard' })
    expect(closeSpy).not.toHaveBeenCalled()
  })
})

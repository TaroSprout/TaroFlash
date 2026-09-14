import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { createApp, nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

const { mockLock, mockUnlock, mockRegister, mockClearScope } = vi.hoisted(() => ({
  mockLock: vi.fn(),
  mockUnlock: vi.fn(),
  mockRegister: vi.fn(),
  mockClearScope: vi.fn()
}))

vi.mock('@/composables/ui/scroll-lock', () => ({
  useScrollLock: () => ({ lock: mockLock, unlock: mockUnlock })
}))

vi.mock('@/composables/shortcuts', () => ({
  useShortcuts: () => ({
    register: mockRegister,
    clearScope: mockClearScope,
    dispose: vi.fn()
  })
}))

import { useOverlayGuards } from '@/components/overlay/use-overlay-guards'
import { useOverlayStore } from '@/stores/overlay-stack'

function makeEntry(id) {
  return {
    id,
    component: {},
    props: {},
    presentation: 'dialog',
    settle: vi.fn(),
    markEntered: vi.fn()
  }
}

let app

function mountGuards(requestClose = vi.fn(), getScrollRoot = () => undefined) {
  let result
  app = createApp({
    setup() {
      result = useOverlayGuards(requestClose, getScrollRoot)
      return () => null
    }
  })
  app.mount(document.createElement('div'))
  return result
}

beforeEach(() => {
  setActivePinia(createPinia())
  mockLock.mockClear()
  mockUnlock.mockClear()
  mockRegister.mockClear()
  mockClearScope.mockClear()
})

afterEach(() => {
  app?.unmount()
  app = undefined
})

describe('useOverlayGuards', () => {
  test('activates the scroll lock and registers esc once the stack has an entry', async () => {
    const store = useOverlayStore()
    mountGuards()

    store.push(makeEntry('a'))
    await nextTick()

    expect(mockLock).toHaveBeenCalledTimes(1)
    expect(mockRegister).toHaveBeenCalledWith({ combo: 'esc', handler: expect.any(Function) })
  })

  test('deactivates once the stack empties', async () => {
    const store = useOverlayStore()
    mountGuards()

    store.push(makeEntry('a'))
    await nextTick()
    mockUnlock.mockClear()
    mockClearScope.mockClear()

    store.remove('a')
    await nextTick()

    expect(mockUnlock).toHaveBeenCalledTimes(1)
    expect(mockClearScope).toHaveBeenCalledTimes(1)
  })

  test('esc routes the current top entry through requestClose', async () => {
    const store = useOverlayStore()
    const requestClose = vi.fn()
    mountGuards(requestClose)

    const top = makeEntry('top')
    store.push(makeEntry('bottom'))
    store.push(top)
    await nextTick()

    const { handler } = mockRegister.mock.calls[0][0]
    handler()

    expect(requestClose).toHaveBeenCalledTimes(1)
    expect(requestClose.mock.calls[0][0].id).toBe('top')
  })

  test('esc is a no-op when the stack is empty', () => {
    const requestClose = vi.fn()
    mountGuards(requestClose)

    // No entries pushed, so activate() never ran and nothing was registered.
    expect(mockRegister).not.toHaveBeenCalled()
  })
})

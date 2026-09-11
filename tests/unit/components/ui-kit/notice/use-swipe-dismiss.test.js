import { describe, test, expect, vi, afterEach } from 'vite-plus/test'
import { createApp, ref, nextTick } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockRegister } = vi.hoisted(() => ({ mockRegister: vi.fn() }))
vi.mock('@/composables/ui/gestures', () => ({ useGestures: () => ({ register: mockRegister }) }))

const { mockCoarse } = vi.hoisted(() => ({ mockCoarse: { ref: null } }))
vi.mock('@/composables/ui/media-query', () => ({ useMatchMedia: () => mockCoarse.ref }))

vi.mock('gsap', () => ({
  gsap: {
    set: vi.fn(),
    to: vi.fn()
  }
}))

const coarseRef = ref(false)
mockCoarse.ref = coarseRef

import { gsap } from 'gsap'
import { useSwipeDismiss } from '@/components/ui-kit/notice/use-swipe-dismiss'

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

function getCallbacks() {
  const call = mockRegister.mock.calls[0]
  if (!call) return null
  return { el: call[0], callbacks: call[1] }
}

afterEach(() => {
  app?.unmount()
  app = null
  mockRegister.mockReset()
  gsap.set.mockClear()
  gsap.to.mockClear()
  coarseRef.value = false
})

function trackUnregisters() {
  const unregisters = []
  mockRegister.mockImplementation(() => {
    const unregister = vi.fn()
    unregisters.push(unregister)
    return unregister
  })
  return unregisters
}

describe('useSwipeDismiss', () => {
  test('does not register the drag handler when the pointer is fine', () => {
    coarseRef.value = false
    const el_ref = ref(document.createElement('div'))
    withSetup(() => useSwipeDismiss(el_ref, { directions: ['up'], onDismiss: vi.fn() }))

    expect(mockRegister).not.toHaveBeenCalled()
  })

  test('registers the drag handler on the element when the pointer is coarse', () => {
    coarseRef.value = true
    const el = document.createElement('div')
    const el_ref = ref(el)
    withSetup(() => useSwipeDismiss(el_ref, { directions: ['up'], onDismiss: vi.fn() }))

    expect(mockRegister).toHaveBeenCalledOnce()
    expect(mockRegister.mock.calls[0][0]).toBe(el)
  })

  test('swiping past the threshold in an allowed direction calls onDismiss', () => {
    coarseRef.value = true
    const onDismiss = vi.fn()
    const el_ref = ref(document.createElement('div'))
    withSetup(() => useSwipeDismiss(el_ref, { directions: ['up'], onDismiss }))

    const { callbacks } = getCallbacks()
    callbacks.onEnd({ dy: -61 })

    expect(onDismiss).toHaveBeenCalledOnce()
  })

  test('swiping past the threshold in a disallowed direction does not call onDismiss and snaps back', () => {
    coarseRef.value = true
    const onDismiss = vi.fn()
    const el = document.createElement('div')
    const el_ref = ref(el)
    withSetup(() => useSwipeDismiss(el_ref, { directions: ['up'], onDismiss }))

    const { callbacks } = getCallbacks()
    callbacks.onEnd({ dy: 61 })

    expect(onDismiss).not.toHaveBeenCalled()
    expect(gsap.to).toHaveBeenCalledWith(el, expect.objectContaining({ y: 0 }))
  })

  test('a drag below the threshold snaps back without dismissing', () => {
    coarseRef.value = true
    const onDismiss = vi.fn()
    const el = document.createElement('div')
    const el_ref = ref(el)
    withSetup(() => useSwipeDismiss(el_ref, { directions: ['up', 'down'], onDismiss }))

    const { callbacks } = getCallbacks()
    callbacks.onEnd({ dy: 20 })

    expect(onDismiss).not.toHaveBeenCalled()
    expect(gsap.to).toHaveBeenCalledWith(el, expect.objectContaining({ y: 0 }))
  })

  test('onCancel always snaps back', () => {
    coarseRef.value = true
    const el = document.createElement('div')
    const el_ref = ref(el)
    withSetup(() => useSwipeDismiss(el_ref, { directions: ['up'], onDismiss: vi.fn() }))

    const { callbacks } = getCallbacks()
    callbacks.onCancel()

    expect(gsap.to).toHaveBeenCalledWith(el, expect.objectContaining({ y: 0 }))
  })

  test('onMove clamps the delta to the allowed directions via gsap.set', () => {
    coarseRef.value = true
    const el = document.createElement('div')
    const el_ref = ref(el)
    withSetup(() => useSwipeDismiss(el_ref, { directions: ['up'], onDismiss: vi.fn() }))

    const { callbacks } = getCallbacks()
    callbacks.onMove({ dy: -30 })
    expect(gsap.set).toHaveBeenCalledWith(el, { y: -30 })

    callbacks.onMove({ dy: 30 })
    expect(gsap.set).toHaveBeenCalledWith(el, { y: 0 })
  })

  test('directions: [up, down] allows dismissal from both directions', () => {
    coarseRef.value = true
    const onDismiss = vi.fn()
    const el_ref = ref(document.createElement('div'))
    withSetup(() => useSwipeDismiss(el_ref, { directions: ['up', 'down'], onDismiss }))

    const { callbacks } = getCallbacks()
    callbacks.onEnd({ dy: 61 })

    expect(onDismiss).toHaveBeenCalledOnce()
  })

  test('switching the watched element from A to B unregisters A before registering B', async () => {
    coarseRef.value = true
    const unregisters = trackUnregisters()
    const el_a = document.createElement('div')
    const el_b = document.createElement('div')
    const el_ref = ref(el_a)
    withSetup(() => useSwipeDismiss(el_ref, { directions: ['up'], onDismiss: vi.fn() }))

    expect(mockRegister).toHaveBeenCalledTimes(1)
    expect(mockRegister.mock.calls[0][0]).toBe(el_a)

    el_ref.value = el_b
    await nextTick()

    expect(unregisters[0]).toHaveBeenCalledOnce()
    expect(mockRegister).toHaveBeenCalledTimes(2)
    expect(mockRegister.mock.calls[1][0]).toBe(el_b)
  })

  test('switching the watched element to undefined unregisters the previous element and registers nothing new', async () => {
    coarseRef.value = true
    const unregisters = trackUnregisters()
    const el_a = document.createElement('div')
    const el_ref = ref(el_a)
    withSetup(() => useSwipeDismiss(el_ref, { directions: ['up'], onDismiss: vi.fn() }))

    el_ref.value = undefined
    await nextTick()

    expect(unregisters[0]).toHaveBeenCalledOnce()
    expect(mockRegister).toHaveBeenCalledTimes(1)
  })

  test('cycling A→B→A registers exactly three times with no refcount accumulation', async () => {
    coarseRef.value = true
    const unregisters = trackUnregisters()
    const el_a = document.createElement('div')
    const el_b = document.createElement('div')
    const el_ref = ref(el_a)
    withSetup(() => useSwipeDismiss(el_ref, { directions: ['up'], onDismiss: vi.fn() }))

    el_ref.value = el_b
    await nextTick()
    el_ref.value = el_a
    await nextTick()

    expect(mockRegister).toHaveBeenCalledTimes(3)
    expect(unregisters).toHaveLength(3)
    expect(unregisters[0]).toHaveBeenCalledOnce()
    expect(unregisters[1]).toHaveBeenCalledOnce()
    expect(unregisters[2]).not.toHaveBeenCalled()
  })
})

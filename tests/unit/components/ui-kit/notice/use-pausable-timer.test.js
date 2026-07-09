import { describe, test, expect, vi, afterEach } from 'vite-plus/test'
import { createApp, ref } from 'vue'
import { usePausableTimer } from '@/components/ui-kit/notice/use-pausable-timer'

// ── Setup ─────────────────────────────────────────────────────────────────────
// usePausableTimer calls onBeforeUnmount, so it needs a component scope.

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
  vi.useRealTimers()
})

describe('usePausableTimer', () => {
  test('pointerenter pauses the timer so advancing past the full delay does not fire', () => {
    vi.useFakeTimers()
    const callback = vi.fn()
    const el_ref = ref(document.createElement('div'))

    withSetup(() => usePausableTimer(el_ref, callback, { delay: 1000 }))

    el_ref.value.dispatchEvent(new Event('pointerenter'))
    vi.advanceTimersByTime(1000)

    expect(callback).not.toHaveBeenCalled()
  })

  test('pointerleave resumes with the remaining time, not the full delay again', () => {
    vi.useFakeTimers()
    const callback = vi.fn()
    const el_ref = ref(document.createElement('div'))

    withSetup(() => usePausableTimer(el_ref, callback, { delay: 1000 }))

    vi.advanceTimersByTime(400)
    el_ref.value.dispatchEvent(new Event('pointerenter'))
    vi.advanceTimersByTime(1000)
    expect(callback).not.toHaveBeenCalled() // still frozen, proves pause holds

    el_ref.value.dispatchEvent(new Event('pointerleave'))
    vi.advanceTimersByTime(599)
    expect(callback).not.toHaveBeenCalled() // remaining ~600ms not yet elapsed

    vi.advanceTimersByTime(1)
    expect(callback).toHaveBeenCalledOnce()
  })

  test('pointercancel resumes the timer, same as pointerleave', () => {
    vi.useFakeTimers()
    const callback = vi.fn()
    const el_ref = ref(document.createElement('div'))

    withSetup(() => usePausableTimer(el_ref, callback, { delay: 1000 }))

    vi.advanceTimersByTime(400)
    el_ref.value.dispatchEvent(new Event('pointerenter'))
    el_ref.value.dispatchEvent(new Event('pointercancel'))
    vi.advanceTimersByTime(599)
    expect(callback).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(callback).toHaveBeenCalledOnce()
  })

  test('persist: true never fires the callback regardless of hover state', () => {
    vi.useFakeTimers()
    const callback = vi.fn()
    const el_ref = ref(document.createElement('div'))

    withSetup(() => usePausableTimer(el_ref, callback, { delay: 1000, persist: true }))

    el_ref.value.dispatchEvent(new Event('pointerenter'))
    el_ref.value.dispatchEvent(new Event('pointerleave'))
    vi.advanceTimersByTime(10000)

    expect(callback).not.toHaveBeenCalled()
  })
})

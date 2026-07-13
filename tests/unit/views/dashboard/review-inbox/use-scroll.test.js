import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { createApp, nextTick, ref } from 'vue'
import { useReviewInboxScroll } from '@/views/dashboard/review-inbox/use-scroll'

// ── ResizeObserver stub ───────────────────────────────────────────────────────
// jsdom does not implement ResizeObserver — stub it and capture the callback so
// tests can trigger a resize recompute manually.

class FakeResizeObserver {
  constructor(cb) {
    this.cb = cb
    FakeResizeObserver.instances.push(this)
  }
  observe() {}
  disconnect() {}
}
FakeResizeObserver.instances = []

vi.stubGlobal('ResizeObserver', FakeResizeObserver)

// ── DOM geometry helpers ──────────────────────────────────────────────────────

function makeStripEl({ scrollWidth = 300, clientWidth = 300, scrollLeft = 0 } = {}) {
  const el = document.createElement('div')
  const first_child = document.createElement('div')
  el.appendChild(first_child)

  Object.defineProperty(el, 'scrollWidth', { value: scrollWidth, configurable: true })
  Object.defineProperty(el, 'clientWidth', { value: clientWidth, configurable: true })
  Object.defineProperty(el, 'scrollLeft', {
    value: scrollLeft,
    configurable: true,
    writable: true
  })
  Object.defineProperty(first_child, 'offsetWidth', { value: 96, configurable: true })

  // jsdom does not implement scrollTo — stub it so prev()/next() can be spied.
  el.scrollTo = () => {}

  return el
}

// ── Host app ──────────────────────────────────────────────────────────────────
// The composable relies on onMounted/onUnmounted, so it needs a real component
// lifecycle. items_el is assigned inside setup() — before onMounted fires — to
// mimic the template ref being bound before mount.

let app

function withSetup(due_decks_fn, el) {
  let result
  app = createApp({
    setup() {
      result = useReviewInboxScroll(due_decks_fn)
      result.items_el.value = el
      return () => {}
    }
  })
  app.mount(document.createElement('div'))
  return result
}

beforeEach(() => {
  FakeResizeObserver.instances.length = 0
})

afterEach(() => {
  app?.unmount()
  app = undefined
})

// ── has_overflow ──────────────────────────────────────────────────────────────

describe('useReviewInboxScroll — has_overflow', () => {
  test('is true when scrollWidth exceeds clientWidth beyond the epsilon', () => {
    const el = makeStripEl({ scrollWidth: 500, clientWidth: 300 })
    const { has_overflow } = withSetup(() => [], el)

    expect(has_overflow.value).toBe(true)
  })

  test('is false when scrollWidth matches clientWidth', () => {
    const el = makeStripEl({ scrollWidth: 300, clientWidth: 300 })
    const { has_overflow } = withSetup(() => [], el)

    expect(has_overflow.value).toBe(false)
  })
})

// ── can_scroll_prev / can_scroll_next ─────────────────────────────────────────

describe('useReviewInboxScroll — can_scroll_prev / can_scroll_next', () => {
  test('can_scroll_prev is false at the start of the strip', () => {
    const el = makeStripEl({ scrollWidth: 500, clientWidth: 300, scrollLeft: 0 })
    const { can_scroll_prev } = withSetup(() => [], el)

    expect(can_scroll_prev.value).toBe(false)
  })

  test('can_scroll_prev is true once scrolled past the epsilon', () => {
    const el = makeStripEl({ scrollWidth: 500, clientWidth: 300, scrollLeft: 50 })
    const { can_scroll_prev } = withSetup(() => [], el)

    expect(can_scroll_prev.value).toBe(true)
  })

  test('can_scroll_next is true when there is more strip to scroll toward', () => {
    const el = makeStripEl({ scrollWidth: 500, clientWidth: 300, scrollLeft: 0 })
    const { can_scroll_next } = withSetup(() => [], el)

    expect(can_scroll_next.value).toBe(true)
  })

  test('can_scroll_next is false once scrolled to the end', () => {
    const el = makeStripEl({ scrollWidth: 500, clientWidth: 300, scrollLeft: 200 })
    const { can_scroll_next } = withSetup(() => [], el)

    expect(can_scroll_next.value).toBe(false)
  })
})

// ── Recompute triggers ────────────────────────────────────────────────────────

describe('useReviewInboxScroll — recompute triggers', () => {
  test('recomputes when the ResizeObserver fires', () => {
    const el = makeStripEl({ scrollWidth: 300, clientWidth: 300 })
    const { has_overflow } = withSetup(() => [], el)
    expect(has_overflow.value).toBe(false)

    Object.defineProperty(el, 'scrollWidth', { value: 600, configurable: true })
    FakeResizeObserver.instances[0].cb()

    expect(has_overflow.value).toBe(true)
  })

  test('recomputes on the native scroll event', () => {
    const el = makeStripEl({ scrollWidth: 500, clientWidth: 300, scrollLeft: 0 })
    const { can_scroll_prev } = withSetup(() => [], el)
    expect(can_scroll_prev.value).toBe(false)

    Object.defineProperty(el, 'scrollLeft', { value: 100, configurable: true })
    el.dispatchEvent(new Event('scroll'))

    expect(can_scroll_prev.value).toBe(true)
  })

  test('recomputes when due_decks().length changes', async () => {
    const el = makeStripEl({ scrollWidth: 300, clientWidth: 300 })
    const decks_ref = ref([])
    const { has_overflow } = withSetup(() => decks_ref.value, el)
    expect(has_overflow.value).toBe(false)

    Object.defineProperty(el, 'scrollWidth', { value: 600, configurable: true })
    decks_ref.value = [{ id: 1 }]
    await nextTick()
    await nextTick()

    expect(has_overflow.value).toBe(true)
  })
})

// ── prev / next ───────────────────────────────────────────────────────────────

describe('useReviewInboxScroll — prev / next', () => {
  test('next() steps by 3 card-widths worth of scroll [obligation]', () => {
    const el = makeStripEl({ scrollWidth: 1000, clientWidth: 300, scrollLeft: 0 })
    const scroll_to = vi.spyOn(el, 'scrollTo').mockImplementation(() => {})
    const { next } = withSetup(() => [], el)

    next()

    // step = (offsetWidth 96 + 4 gap) * PAGE_SIZE 3 = 300
    expect(scroll_to).toHaveBeenCalledWith({ left: 300, behavior: 'smooth' })
  })

  test('prev() steps by 3 card-widths worth of scroll in the negative direction [obligation]', () => {
    const el = makeStripEl({ scrollWidth: 1000, clientWidth: 300, scrollLeft: 400 })
    const scroll_to = vi.spyOn(el, 'scrollTo').mockImplementation(() => {})
    const { prev } = withSetup(() => [], el)

    prev()

    expect(scroll_to).toHaveBeenCalledWith({ left: 100, behavior: 'smooth' })
  })

  test('next() clamps the target to max_scroll_left when the remaining distance is under 3 card-widths [obligation]', () => {
    // max_scroll_left = 500 - 300 = 200; unclamped target would be 150 + 300 = 450
    const el = makeStripEl({ scrollWidth: 500, clientWidth: 300, scrollLeft: 150 })
    const scroll_to = vi.spyOn(el, 'scrollTo').mockImplementation(() => {})
    const { next } = withSetup(() => [], el)

    next()

    expect(scroll_to).toHaveBeenCalledWith({ left: 200, behavior: 'smooth' })
  })

  test('prev() clamps the target to 0 when the remaining distance to the start is under 3 card-widths [obligation]', () => {
    // unclamped target would be 100 - 300 = -200
    const el = makeStripEl({ scrollWidth: 1000, clientWidth: 300, scrollLeft: 100 })
    const scroll_to = vi.spyOn(el, 'scrollTo').mockImplementation(() => {})
    const { prev } = withSetup(() => [], el)

    prev()

    expect(scroll_to).toHaveBeenCalledWith({ left: 0, behavior: 'smooth' })
  })
})

// ── Cleanup ───────────────────────────────────────────────────────────────────

describe('useReviewInboxScroll — unmount', () => {
  test('removes the scroll listener and disconnects the observer on unmount', () => {
    const el = makeStripEl({ scrollWidth: 500, clientWidth: 300 })
    const disconnect = vi.spyOn(FakeResizeObserver.prototype, 'disconnect')
    const remove_listener = vi.spyOn(el, 'removeEventListener')
    withSetup(() => [], el)

    app.unmount()
    app = undefined

    expect(disconnect).toHaveBeenCalled()
    expect(remove_listener).toHaveBeenCalledWith('scroll', expect.any(Function))
  })
})

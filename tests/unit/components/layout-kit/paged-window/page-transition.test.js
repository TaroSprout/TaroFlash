import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { ref, computed } from 'vue'
import { flushPromises } from '@vue/test-utils'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockFadeEnter, mockFadeLeave, mockTabSlideEnter, mockTabSlideLeave } = vi.hoisted(() => ({
  mockFadeEnter: vi.fn((_el, done) => done?.()),
  mockFadeLeave: vi.fn((_el, done) => done?.()),
  mockTabSlideEnter: vi.fn(() => vi.fn((_el, done) => done?.())),
  mockTabSlideLeave: vi.fn(() => vi.fn((_el, done) => done?.()))
}))

vi.mock('@/utils/animations/fade', () => ({
  fadeEnter: mockFadeEnter,
  fadeLeave: mockFadeLeave
}))

vi.mock('@/utils/animations/tab-slide', () => ({
  tabSlideEnter: mockTabSlideEnter,
  tabSlideLeave: mockTabSlideLeave
}))

import { usePageTransition } from '@/components/layout-kit/paged-window/page-transition'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEl() {
  return document.createElement('div')
}

function makeLayout(mode = 'tablet') {
  const _mode = ref(mode)
  return {
    layout_mode: computed(() => _mode.value),
    setMode: (v) => (_mode.value = v)
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockTabSlideEnter.mockImplementation(() => vi.fn((_el, done) => done?.()))
  mockTabSlideLeave.mockImplementation(() => vi.fn((_el, done) => done?.()))
})

// ── nav_direction ─────────────────────────────────────────────────────────────

describe('usePageTransition — nav_direction', () => {
  test('returns nav_direction ref initialised to "forward"', () => {
    const { layout_mode } = makeLayout('tablet')
    const outlet = ref(undefined)
    const { nav_direction } = usePageTransition(layout_mode, outlet)
    expect(nav_direction.value).toBe('forward')
  })

  test('callers can flip nav_direction to "back"', () => {
    const { layout_mode } = makeLayout('tablet')
    const outlet = ref(undefined)
    const { nav_direction } = usePageTransition(layout_mode, outlet)
    nav_direction.value = 'back'
    expect(nav_direction.value).toBe('back')
  })

  test('callers can flip nav_direction to "forward"', () => {
    const { layout_mode } = makeLayout('tablet')
    const outlet = ref(undefined)
    const { nav_direction } = usePageTransition(layout_mode, outlet)
    nav_direction.value = 'forward'
    expect(nav_direction.value).toBe('forward')
  })
})

// ── onPageEnter — routing ──────────────────────────────────────────────────────

describe('usePageTransition — onPageEnter routing', () => {
  test('routes to tabSlideEnter on phone mode', () => {
    const { layout_mode } = makeLayout('phone')
    const outlet = ref(document.createElement('div'))
    const { onPageEnter } = usePageTransition(layout_mode, outlet)

    const done = vi.fn()
    onPageEnter(makeEl(), done)

    expect(mockTabSlideEnter).toHaveBeenCalledOnce()
    expect(mockFadeEnter).not.toHaveBeenCalled()
    expect(done).toHaveBeenCalledOnce()
  })

  test('routes to fadeEnter on tablet mode', () => {
    const { layout_mode } = makeLayout('tablet')
    const outlet = ref(document.createElement('div'))
    const { onPageEnter } = usePageTransition(layout_mode, outlet)

    const done = vi.fn()
    onPageEnter(makeEl(), done)

    expect(mockFadeEnter).toHaveBeenCalledOnce()
    expect(mockTabSlideEnter).not.toHaveBeenCalled()
  })

  test('routes to fadeEnter on desktop mode', () => {
    const { layout_mode } = makeLayout('desktop')
    const outlet = ref(document.createElement('div'))
    const { onPageEnter } = usePageTransition(layout_mode, outlet)

    const done = vi.fn()
    onPageEnter(makeEl(), done)

    expect(mockFadeEnter).toHaveBeenCalledOnce()
    expect(mockTabSlideEnter).not.toHaveBeenCalled()
  })
})

// ── onPageLeave — routing + between hook [obligation] ─────────────────────────

describe('usePageTransition — onPageLeave routing', () => {
  test('routes to tabSlideLeave on phone mode', () => {
    const { layout_mode } = makeLayout('phone')
    const outlet = ref(document.createElement('div'))
    const { onPageLeave } = usePageTransition(layout_mode, outlet)

    const done = vi.fn()
    onPageLeave(makeEl(), done)

    expect(mockTabSlideLeave).toHaveBeenCalledOnce()
    expect(mockFadeLeave).not.toHaveBeenCalled()
  })

  test('routes to fadeLeave on tablet mode', () => {
    const { layout_mode } = makeLayout('tablet')
    const outlet = ref(document.createElement('div'))
    const { onPageLeave } = usePageTransition(layout_mode, outlet)

    const done = vi.fn()
    onPageLeave(makeEl(), done)

    expect(mockFadeLeave).toHaveBeenCalledOnce()
    expect(mockTabSlideLeave).not.toHaveBeenCalled()
  })

  test('routes to fadeLeave on desktop mode', () => {
    const { layout_mode } = makeLayout('desktop')
    const outlet = ref(document.createElement('div'))
    const { onPageLeave } = usePageTransition(layout_mode, outlet)

    const done = vi.fn()
    onPageLeave(makeEl(), done)

    expect(mockFadeLeave).toHaveBeenCalledOnce()
    expect(mockTabSlideLeave).not.toHaveBeenCalled()
  })

  test('passes nav_direction and outlet to tabSlideLeave/tabSlideEnter', () => {
    const { layout_mode } = makeLayout('phone')
    const outlet_el = document.createElement('div')
    const outlet = ref(outlet_el)
    const { onPageLeave, onPageEnter, nav_direction } = usePageTransition(layout_mode, outlet)

    onPageLeave(makeEl(), vi.fn())
    expect(mockTabSlideLeave).toHaveBeenCalledWith(nav_direction, outlet_el)

    onPageEnter(makeEl(), vi.fn())
    expect(mockTabSlideEnter).toHaveBeenCalledWith(nav_direction, outlet_el)
  })
})

describe('usePageTransition — between hook [obligation]', () => {
  test('awaits `between` in the gap after the leave animation, before calling done, on every page change', async () => {
    const { layout_mode } = makeLayout('tablet')
    const outlet = ref(document.createElement('div'))
    let resolveBetween
    const between = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveBetween = resolve
        })
    )
    const { onPageLeave } = usePageTransition(layout_mode, outlet, { between })

    const done = vi.fn()
    onPageLeave(makeEl(), done)
    await flushPromises()

    expect(between).toHaveBeenCalledOnce()
    expect(done).not.toHaveBeenCalled()

    resolveBetween()
    await flushPromises()

    expect(done).toHaveBeenCalledOnce()
  })

  test('is safe to call when `between` is a no-op-guarded function that resolves immediately with nothing changed [obligation]', async () => {
    const { layout_mode } = makeLayout('tablet')
    const outlet = ref(document.createElement('div'))
    const between = vi.fn(() => Promise.resolve())
    const { onPageLeave } = usePageTransition(layout_mode, outlet, { between })

    const done = vi.fn()
    await onPageLeave(makeEl(), done)

    expect(between).toHaveBeenCalledOnce()
    expect(done).toHaveBeenCalledOnce()
  })

  test('without a `between` option configured, onPageLeave still resolves and calls done', async () => {
    const { layout_mode } = makeLayout('tablet')
    const outlet = ref(document.createElement('div'))
    const { onPageLeave } = usePageTransition(layout_mode, outlet)

    const done = vi.fn()
    await onPageLeave(makeEl(), done)

    expect(done).toHaveBeenCalledOnce()
  })

  test('runs on every page change, not just the first', async () => {
    const { layout_mode } = makeLayout('tablet')
    const outlet = ref(document.createElement('div'))
    const between = vi.fn(() => Promise.resolve())
    const { onPageLeave } = usePageTransition(layout_mode, outlet, { between })

    await onPageLeave(makeEl(), vi.fn())
    await onPageLeave(makeEl(), vi.fn())

    expect(between).toHaveBeenCalledTimes(2)
  })
})

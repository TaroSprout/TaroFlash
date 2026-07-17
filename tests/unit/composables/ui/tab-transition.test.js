import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { ref, computed } from 'vue'

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

import { useTabTransition } from '@/composables/ui/tab-transition'

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
  // Re-wire mockTabSlideEnter/Leave so each call returns a fresh inner fn
  mockTabSlideEnter.mockImplementation(() => vi.fn((_el, done) => done?.()))
  mockTabSlideLeave.mockImplementation(() => vi.fn((_el, done) => done?.()))
})

// ── nav_direction ─────────────────────────────────────────────────────────────

describe('useTabTransition — nav_direction [obligation]', () => {
  test('returns nav_direction ref initialised to "forward"', () => {
    const { layout_mode } = makeLayout('tablet')
    const tab_outlet = ref(undefined)
    const { nav_direction } = useTabTransition(layout_mode, tab_outlet)
    expect(nav_direction.value).toBe('forward')
  })

  test('callers can flip nav_direction to "back"', () => {
    const { layout_mode } = makeLayout('tablet')
    const tab_outlet = ref(undefined)
    const { nav_direction } = useTabTransition(layout_mode, tab_outlet)
    nav_direction.value = 'back'
    expect(nav_direction.value).toBe('back')
  })

  test('callers can flip nav_direction to "forward"', () => {
    const { layout_mode } = makeLayout('tablet')
    const tab_outlet = ref(undefined)
    const { nav_direction } = useTabTransition(layout_mode, tab_outlet)
    nav_direction.value = 'forward'
    expect(nav_direction.value).toBe('forward')
  })
})

// ── onTabEnter — regression: first call must animate, not skip ────────────────

describe('useTabTransition — onTabEnter does not skip the first call [obligation]', () => {
  test('first onTabEnter animates (does not skip) — regression for removed initial-render guard', () => {
    const { layout_mode } = makeLayout('sheet')
    const tab_outlet = ref(document.createElement('div'))
    const { onTabEnter } = useTabTransition(layout_mode, tab_outlet)

    const done = vi.fn()
    onTabEnter(makeEl(), done)

    // A single call routes straight to the sheet-mode animation — no skip,
    // no second call required. The removed guard used to freeze __main's
    // height on tabSlideLeave and never re-run tabSlideEnter to unfreeze it
    // on the very next enter, clipping content until the user navigated away
    // and back.
    expect(mockTabSlideEnter).toHaveBeenCalledOnce()
    expect(done).toHaveBeenCalledOnce()
  })
})

// ── onTabEnter — routing ──────────────────────────────────────────────────────

describe('useTabTransition — onTabEnter routing [obligation]', () => {
  test('routes to tabSlideEnter on sheet mode', () => {
    const { layout_mode } = makeLayout('sheet')
    const tab_outlet = ref(document.createElement('div'))
    const { onTabEnter } = useTabTransition(layout_mode, tab_outlet)

    const done = vi.fn()
    onTabEnter(makeEl(), done)

    expect(mockTabSlideEnter).toHaveBeenCalledOnce()
    expect(mockFadeEnter).not.toHaveBeenCalled()
  })

  test('routes to fadeEnter on tablet mode', () => {
    const { layout_mode } = makeLayout('tablet')
    const tab_outlet = ref(document.createElement('div'))
    const { onTabEnter } = useTabTransition(layout_mode, tab_outlet)

    const done = vi.fn()
    onTabEnter(makeEl(), done)

    expect(mockFadeEnter).toHaveBeenCalledOnce()
    expect(mockTabSlideEnter).not.toHaveBeenCalled()
  })

  test('routes to fadeEnter on desktop mode', () => {
    const { layout_mode } = makeLayout('desktop')
    const tab_outlet = ref(document.createElement('div'))
    const { onTabEnter } = useTabTransition(layout_mode, tab_outlet)

    const done = vi.fn()
    onTabEnter(makeEl(), done)

    expect(mockFadeEnter).toHaveBeenCalledOnce()
    expect(mockTabSlideEnter).not.toHaveBeenCalled()
  })
})

// ── onTabLeave — routing ──────────────────────────────────────────────────────

describe('useTabTransition — onTabLeave routing [obligation]', () => {
  test('routes to tabSlideLeave on sheet mode', () => {
    const { layout_mode } = makeLayout('sheet')
    const tab_outlet = ref(document.createElement('div'))
    const { onTabLeave } = useTabTransition(layout_mode, tab_outlet)

    const done = vi.fn()
    onTabLeave(makeEl(), done)

    expect(mockTabSlideLeave).toHaveBeenCalledOnce()
    expect(mockFadeLeave).not.toHaveBeenCalled()
  })

  test('routes to fadeLeave on tablet mode', () => {
    const { layout_mode } = makeLayout('tablet')
    const tab_outlet = ref(document.createElement('div'))
    const { onTabLeave } = useTabTransition(layout_mode, tab_outlet)

    const done = vi.fn()
    onTabLeave(makeEl(), done)

    expect(mockFadeLeave).toHaveBeenCalledOnce()
    expect(mockTabSlideLeave).not.toHaveBeenCalled()
  })

  test('routes to fadeLeave on desktop mode', () => {
    const { layout_mode } = makeLayout('desktop')
    const tab_outlet = ref(document.createElement('div'))
    const { onTabLeave } = useTabTransition(layout_mode, tab_outlet)

    const done = vi.fn()
    onTabLeave(makeEl(), done)

    expect(mockFadeLeave).toHaveBeenCalledOnce()
    expect(mockTabSlideLeave).not.toHaveBeenCalled()
  })

  test('passes nav_direction and tab_outlet to tabSlideLeave', () => {
    const { layout_mode } = makeLayout('sheet')
    const outlet = document.createElement('div')
    const tab_outlet = ref(outlet)
    const { onTabLeave, nav_direction } = useTabTransition(layout_mode, tab_outlet)

    onTabLeave(makeEl(), vi.fn())

    expect(mockTabSlideLeave).toHaveBeenCalledWith(nav_direction, outlet)
  })

  test('passes nav_direction and tab_outlet to tabSlideEnter', () => {
    const { layout_mode } = makeLayout('sheet')
    const outlet = document.createElement('div')
    const tab_outlet = ref(outlet)
    const { onTabEnter, nav_direction } = useTabTransition(layout_mode, tab_outlet)

    onTabEnter(makeEl(), vi.fn())

    expect(mockTabSlideEnter).toHaveBeenCalledWith(nav_direction, outlet)
  })
})

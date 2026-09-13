import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { ref, computed } from 'vue'
import { flushPromises } from '@vue/test-utils'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
// The phone slide is driven through a single shared motionTransition instance;
// tablet/desktop route to the raw fade helpers. Mock all three so routing can be
// asserted without the real driver.

const {
  mockFadeEnter,
  mockFadeLeave,
  mockTabSlideEnter,
  mockTabSlideLeave,
  mockSlideEnter,
  mockSlideLeave,
  mockMotionTransition
} = vi.hoisted(() => {
  const mockSlideEnter = vi.fn((_el, done) => done?.())
  const mockSlideLeave = vi.fn((_el, done) => done?.())
  return {
    mockFadeEnter: vi.fn((_el, done) => done?.()),
    mockFadeLeave: vi.fn((_el, done) => done?.()),
    mockTabSlideEnter: vi.fn(() => 'enter-motion'),
    mockTabSlideLeave: vi.fn(() => 'leave-motion'),
    mockSlideEnter,
    mockSlideLeave,
    mockMotionTransition: vi.fn(() => ({ onEnter: mockSlideEnter, onLeave: mockSlideLeave }))
  }
})

vi.mock('@/utils/animations/fade', () => ({
  fadeEnter: mockFadeEnter,
  fadeLeave: mockFadeLeave
}))

vi.mock('@/utils/animations/tab-slide', () => ({
  tabSlideEnter: mockTabSlideEnter,
  tabSlideLeave: mockTabSlideLeave
}))

vi.mock('@/utils/motion/transition', () => ({
  motionTransition: mockMotionTransition
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
  mockMotionTransition.mockReturnValue({ onEnter: mockSlideEnter, onLeave: mockSlideLeave })
})

// ── nav_direction ─────────────────────────────────────────────────────────────

describe('usePageTransition — nav_direction', () => {
  test('returns nav_direction ref initialised to "forward"', () => {
    const { layout_mode } = makeLayout('tablet')
    const { nav_direction } = usePageTransition(layout_mode, ref(undefined))
    expect(nav_direction.value).toBe('forward')
  })

  test('callers can flip nav_direction to "back" and back to "forward"', () => {
    const { layout_mode } = makeLayout('tablet')
    const { nav_direction } = usePageTransition(layout_mode, ref(undefined))
    nav_direction.value = 'back'
    expect(nav_direction.value).toBe('back')
    nav_direction.value = 'forward'
    expect(nav_direction.value).toBe('forward')
  })
})

// ── composes the shared slide from the tab motions ──────────────────────────────

describe('usePageTransition — shared slide composition', () => {
  test('builds one motionTransition from the tab enter/leave motions', () => {
    const { layout_mode } = makeLayout('phone')
    const outlet = ref(document.createElement('div'))
    const { nav_direction } = usePageTransition(layout_mode, outlet)

    expect(mockTabSlideEnter).toHaveBeenCalledWith(nav_direction, outlet)
    expect(mockTabSlideLeave).toHaveBeenCalledWith(nav_direction, outlet)
    expect(mockMotionTransition).toHaveBeenCalledWith('enter-motion', 'leave-motion')
  })
})

// ── onPageEnter — routing ────────────────────────────────────────────────────────

describe('usePageTransition — onPageEnter routing', () => {
  test('routes to the shared slide on phone', () => {
    const { layout_mode } = makeLayout('phone')
    const { onPageEnter } = usePageTransition(layout_mode, ref(document.createElement('div')))

    const done = vi.fn()
    onPageEnter(makeEl(), done)

    expect(mockSlideEnter).toHaveBeenCalledOnce()
    expect(mockFadeEnter).not.toHaveBeenCalled()
    expect(done).toHaveBeenCalledOnce()
  })

  test('routes to fadeEnter on tablet', () => {
    const { layout_mode } = makeLayout('tablet')
    const { onPageEnter } = usePageTransition(layout_mode, ref(document.createElement('div')))

    onPageEnter(makeEl(), vi.fn())

    expect(mockFadeEnter).toHaveBeenCalledOnce()
    expect(mockSlideEnter).not.toHaveBeenCalled()
  })

  test('routes to fadeEnter on desktop', () => {
    const { layout_mode } = makeLayout('desktop')
    const { onPageEnter } = usePageTransition(layout_mode, ref(document.createElement('div')))

    onPageEnter(makeEl(), vi.fn())

    expect(mockFadeEnter).toHaveBeenCalledOnce()
    expect(mockSlideEnter).not.toHaveBeenCalled()
  })
})

// ── onPageLeave — routing ─────────────────────────────────────────────────────

describe('usePageTransition — onPageLeave routing', () => {
  test('routes to the shared slide on phone', () => {
    const { layout_mode } = makeLayout('phone')
    const { onPageLeave } = usePageTransition(layout_mode, ref(document.createElement('div')))

    onPageLeave(makeEl(), vi.fn())

    expect(mockSlideLeave).toHaveBeenCalledOnce()
    expect(mockFadeLeave).not.toHaveBeenCalled()
  })

  test('routes to fadeLeave on tablet', () => {
    const { layout_mode } = makeLayout('tablet')
    const { onPageLeave } = usePageTransition(layout_mode, ref(document.createElement('div')))

    onPageLeave(makeEl(), vi.fn())

    expect(mockFadeLeave).toHaveBeenCalledOnce()
    expect(mockSlideLeave).not.toHaveBeenCalled()
  })

  test('routes to fadeLeave on desktop', () => {
    const { layout_mode } = makeLayout('desktop')
    const { onPageLeave } = usePageTransition(layout_mode, ref(document.createElement('div')))

    onPageLeave(makeEl(), vi.fn())

    expect(mockFadeLeave).toHaveBeenCalledOnce()
    expect(mockSlideLeave).not.toHaveBeenCalled()
  })
})

// ── between hook ──────────────────────────────────────────────────────────────

describe('usePageTransition — between hook', () => {
  test('awaits `between` in the gap after the leave, before calling done', async () => {
    const { layout_mode } = makeLayout('tablet')
    let resolveBetween
    const between = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveBetween = resolve
        })
    )
    const { onPageLeave } = usePageTransition(layout_mode, ref(undefined), { between })

    const done = vi.fn()
    onPageLeave(makeEl(), done)
    await flushPromises()

    expect(between).toHaveBeenCalledOnce()
    expect(done).not.toHaveBeenCalled()

    resolveBetween()
    await flushPromises()

    expect(done).toHaveBeenCalledOnce()
  })

  test('without a `between` option, onPageLeave still resolves and calls done', async () => {
    const { layout_mode } = makeLayout('tablet')
    const { onPageLeave } = usePageTransition(layout_mode, ref(undefined))

    const done = vi.fn()
    await onPageLeave(makeEl(), done)

    expect(done).toHaveBeenCalledOnce()
  })

  test('runs on every page change, not just the first', async () => {
    const { layout_mode } = makeLayout('tablet')
    const between = vi.fn(() => Promise.resolve())
    const { onPageLeave } = usePageTransition(layout_mode, ref(undefined), { between })

    await onPageLeave(makeEl(), vi.fn())
    await onPageLeave(makeEl(), vi.fn())

    expect(between).toHaveBeenCalledTimes(2)
  })
})

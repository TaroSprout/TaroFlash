import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'

const { scrollLineIntoView, scrollWordIntoDeadzone, cancelScroll } =
  await import('@/utils/animations/transcript-scroll')

// The transcript always scrolls the page itself — stub window/document metrics per test.
function stubViewport({
  scrollY = 0,
  innerHeight = 100,
  scrollHeight = 1000,
  clientHeight = 100
} = {}) {
  vi.stubGlobal('scrollY', scrollY)
  vi.stubGlobal('innerHeight', innerHeight)
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    value: scrollHeight,
    configurable: true
  })
  Object.defineProperty(document.documentElement, 'clientHeight', {
    value: clientHeight,
    configurable: true
  })
}

function makeLine({ top = 500, height = 20 } = {}) {
  return { getBoundingClientRect: () => ({ top, height }) }
}

// Make a word element whose getBoundingClientRect returns the given viewport coords.
// `bottom` defaults to `top + 20` to keep tests concise.
function makeWord({ top = 0, bottom } = {}) {
  const b = bottom ?? top + 20
  return { getBoundingClientRect: () => ({ top, bottom: b }) }
}

let scrollToMock

beforeEach(() => {
  scrollToMock = vi.fn()
  vi.stubGlobal('scrollTo', scrollToMock)
  stubViewport()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('scrollLineIntoView', () => {
  test('animate=false jumps the scroll instantly (behavior: auto)', () => {
    scrollLineIntoView(makeLine(), false)

    // 500 − 100*0.4 + 20/2 = 470, clamped into [0, 900].
    expect(scrollToMock).toHaveBeenCalledWith({ top: 470, behavior: 'auto' })
  })

  test('animate=true (default) scrolls smoothly (behavior: smooth)', () => {
    scrollLineIntoView(makeLine())

    expect(scrollToMock).toHaveBeenCalledWith({ top: 470, behavior: 'smooth' })
  })
})

// Deadzone constants from the source: DEADZONE_TOP=0.15, DEADZONE_BOTTOM=0.35,
// SCROLL_ANCHOR=0.2. Tests use a 100px-tall viewport to keep arithmetic readable.
// Deadzone band: 15px–35px. Scroll anchor: 20px from top of viewport.

describe('scrollWordIntoDeadzone', () => {
  // [obligation] word fully inside the deadzone band: no scroll fires.
  test('no-op when word top ≥ 15% and bottom ≤ 35% of viewport', () => {
    const word = makeWord({ top: 16, bottom: 30 })

    scrollWordIntoDeadzone(word, false)

    expect(scrollToMock).not.toHaveBeenCalled()
  })

  // [obligation] word bottom exceeds the deadzone bottom → scroll fires.
  test('scrolls when word exits bottom of deadzone (bottom > 35%)', () => {
    const word = makeWord({ top: 50, bottom: 60 })

    scrollWordIntoDeadzone(word, false)

    // target = el_top_within − viewport * SCROLL_ANCHOR = 50 − 100*0.2 = 30, clamped [0,900].
    expect(scrollToMock).toHaveBeenCalledWith({ top: 30, behavior: 'auto' })
  })

  // [obligation] word above deadzone top → scroll fires.
  test('scrolls when word is above deadzone top (top < 15%)', () => {
    const word = makeWord({ top: 5, bottom: 15 })

    scrollWordIntoDeadzone(word, false)

    // target = 5 − 100*0.2 = −15, clamped to 0.
    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
  })

  test('animate=true drives a smooth scroll', () => {
    const word = makeWord({ top: 50, bottom: 60 })

    scrollWordIntoDeadzone(word, true)

    expect(scrollToMock).toHaveBeenCalledWith({ top: 30, behavior: 'smooth' })
  })

  test('target is clamped to 0 when computed target would be negative', () => {
    // Word near the top: el_top_within − anchor would go negative.
    const word = makeWord({ top: 10, bottom: 50 }) // bottom > deadzone_bottom (35), triggers scroll

    scrollWordIntoDeadzone(word, false)

    // target = 10 − 20 = −10, clamped to 0.
    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
  })

  test('target is clamped to max scroll when computed target would overshoot', () => {
    // scrollY=850, viewport=100, scrollHeight=1000 → max=900.
    stubViewport({ scrollY: 850, innerHeight: 100, scrollHeight: 1000, clientHeight: 100 })
    // In viewport: el.top = 990 − (scroll offset baked into getBoundingClientRect) = 990.
    const word = makeWord({ top: 990, bottom: 1010 })

    scrollWordIntoDeadzone(word, false)

    // el_top_within = 990 + 850 = 1840, target = 1840 − 20 = 1820, clamped to max=900.
    expect(scrollToMock).toHaveBeenCalledWith({ top: 900, behavior: 'auto' })
  })
})

describe('cancelScroll', () => {
  // [obligation] Re-issuing scrollTo at the current position interrupts any
  // in-flight native smooth scroll so it stops fighting a manual scroll.
  test('scrolls to the current position with behavior "auto" to interrupt any smooth scroll', () => {
    stubViewport({ scrollY: 234 })

    cancelScroll()

    expect(scrollToMock).toHaveBeenCalledWith({ top: 234, behavior: 'auto' })
  })
})

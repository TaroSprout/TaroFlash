import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { toMock, killMock } = vi.hoisted(() => ({ toMock: vi.fn(), killMock: vi.fn() }))

vi.mock('gsap', () => ({ gsap: { to: toMock, killTweensOf: killMock } }))

const { scrollLineIntoView, scrollWordIntoDeadzone } =
  await import('@/utils/animations/transcript-scroll')

// A minimal element scroller (not `window`, so it's treated as an HTMLElement).
function makeScroller({ scrollTop = 0, clientHeight = 100, scrollHeight = 1000, top = 0 } = {}) {
  return { scrollTop, clientHeight, scrollHeight, getBoundingClientRect: () => ({ top }) }
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

beforeEach(() => {
  toMock.mockClear()
  killMock.mockClear()
})

describe('scrollLineIntoView', () => {
  test('animate=false jumps the scroll instantly and runs no tween', () => {
    const scroller = makeScroller()

    scrollLineIntoView(scroller, makeLine(), false)

    expect(toMock).not.toHaveBeenCalled()
    // 500 − 100*0.4 + 20/2 = 470, clamped into [0, 900].
    expect(scroller.scrollTop).toBe(470)
  })

  test('animate=true (default) drives a gsap tween instead of a hard jump', () => {
    const scroller = makeScroller()

    scrollLineIntoView(scroller, makeLine())

    expect(toMock).toHaveBeenCalledTimes(1)
    expect(scroller.scrollTop).toBe(0) // the tween owns scrollTop, not a sync write
  })
})

// Deadzone constants from the source: DEADZONE_TOP=0.15, DEADZONE_BOTTOM=0.35,
// SCROLL_ANCHOR=0.2. Tests use a 100px-tall scroller to keep arithmetic readable.
// Deadzone band: 15px–35px. Scroll anchor: 20px from top of scroller.

describe('scrollWordIntoDeadzone', () => {
  // [obligation] word fully inside the deadzone band: no scroll fires.
  test('no-op when word top ≥ 15% and bottom ≤ 35% of viewport', () => {
    // Scroller: scrollTop=0, clientHeight=100, scrollHeight=1000, top=0.
    // Word sits at viewport y=16 (top) to y=30 (bottom) — inside 15%–35%.
    const scroller = makeScroller({ scrollTop: 0, clientHeight: 100, scrollHeight: 1000, top: 0 })
    const word = makeWord({ top: 16, bottom: 30 })

    scrollWordIntoDeadzone(scroller, word, false)

    expect(scroller.scrollTop).toBe(0)
    expect(toMock).not.toHaveBeenCalled()
  })

  // [obligation] word bottom exceeds the deadzone bottom → scroll fires.
  test('scrolls when word exits bottom of deadzone (bottom > 35%)', () => {
    // Scroller: scrollTop=0, clientHeight=100, scrollHeight=1000, top=0.
    // Word sits at top=50px, bottom=60px — below DEADZONE_BOTTOM (35px).
    const scroller = makeScroller({ scrollTop: 0, clientHeight: 100, scrollHeight: 1000, top: 0 })
    const word = makeWord({ top: 50, bottom: 60 })

    scrollWordIntoDeadzone(scroller, word, false)

    // target = el_top_within − viewport * SCROLL_ANCHOR = 50 − 100*0.2 = 30, clamped [0,900].
    expect(scroller.scrollTop).toBe(30)
    expect(toMock).not.toHaveBeenCalled()
  })

  // [obligation] word above deadzone top → scroll fires.
  test('scrolls when word is above deadzone top (top < 15%)', () => {
    // Word sits at top=5px, bottom=15px — above DEADZONE_TOP (15px).
    const scroller = makeScroller({ scrollTop: 0, clientHeight: 100, scrollHeight: 1000, top: 0 })
    const word = makeWord({ top: 5, bottom: 15 })

    scrollWordIntoDeadzone(scroller, word, false)

    // target = 5 − 100*0.2 = −15, clamped to 0.
    expect(scroller.scrollTop).toBe(0)
    expect(toMock).not.toHaveBeenCalled()
  })

  test('animate=true drives a gsap tween and does not hard-set scrollTop', () => {
    const scroller = makeScroller({ scrollTop: 0, clientHeight: 100, scrollHeight: 1000, top: 0 })
    const word = makeWord({ top: 50, bottom: 60 })

    scrollWordIntoDeadzone(scroller, word, true)

    expect(toMock).toHaveBeenCalledTimes(1)
    expect(scroller.scrollTop).toBe(0) // tween owns it, no sync write
  })

  test('target is clamped to 0 when computed target would be negative', () => {
    // Word near the top: el_top_within − anchor would go negative.
    const scroller = makeScroller({ scrollTop: 0, clientHeight: 100, scrollHeight: 1000, top: 0 })
    const word = makeWord({ top: 10, bottom: 50 }) // bottom > deadzone_bottom (35), triggers scroll

    scrollWordIntoDeadzone(scroller, word, false)

    // target = 10 − 20 = −10, clamped to 0.
    expect(scroller.scrollTop).toBe(0)
  })

  test('target is clamped to max scroll when computed target would overshoot', () => {
    // Scroller near the bottom: scrollHeight=1000, clientHeight=100 → max=900.
    // Word at top=990 (would want target = 990 − 20 = 970, > max 900).
    // But scroller top=0 and scrollTop must be set to show word at the bottom of content.
    const scroller = makeScroller({
      scrollTop: 850,
      clientHeight: 100,
      scrollHeight: 1000,
      top: 0
    })
    // In viewport: el.top = 990 − 850 = 140 (off screen) > deadzone_bottom (35px) → triggers.
    const word = makeWord({ top: 990, bottom: 1010 })

    scrollWordIntoDeadzone(scroller, word, false)

    // el_top_within = 990 − 0 + 850 = 1840, target = 1840 − 20 = 1820, clamped to max=900.
    expect(scroller.scrollTop).toBe(900)
  })
})

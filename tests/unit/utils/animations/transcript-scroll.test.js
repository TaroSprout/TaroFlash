import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { toMock, killMock } = vi.hoisted(() => ({ toMock: vi.fn(), killMock: vi.fn() }))

vi.mock('gsap', () => ({ gsap: { to: toMock, killTweensOf: killMock } }))

const { scrollLineIntoView } = await import('@/utils/animations/transcript-scroll')

// A minimal element scroller (not `window`, so it's treated as an HTMLElement).
function makeScroller({ scrollTop = 0, clientHeight = 100, scrollHeight = 1000, top = 0 } = {}) {
  return { scrollTop, clientHeight, scrollHeight, getBoundingClientRect: () => ({ top }) }
}

function makeLine({ top = 500, height = 20 } = {}) {
  return { getBoundingClientRect: () => ({ top, height }) }
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

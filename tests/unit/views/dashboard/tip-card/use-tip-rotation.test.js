import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp } from 'vue'

// ── Helper: mount a minimal Vue app so onBeforeUnmount can fire ───────────────

function withSetup(composable) {
  let result
  const app = createApp({
    setup() {
      result = composable()
      return () => null
    }
  })
  app.mount(document.createElement('div'))
  return [result, app]
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.resetModules()
})

// ── Random starting index ──────────────────────────────────────────────────────

describe('useTipRotation — random starting index', () => {
  test('starting tip is always a valid TIPS member when Math.random returns 0', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { useTipRotation } = await import('@/views/dashboard/tip-card/use-tip-rotation')
    const { TIPS } = await import('@/utils/tips/catalog')

    const [result, app] = withSetup(useTipRotation)
    expect(TIPS).toContainEqual(result.tip.value)
    app.unmount()
    Math.random.mockRestore()
  })

  test('starting tip is always a valid TIPS member when Math.random returns near 1', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    const { useTipRotation } = await import('@/views/dashboard/tip-card/use-tip-rotation')
    const { TIPS } = await import('@/utils/tips/catalog')

    const [result, app] = withSetup(useTipRotation)
    expect(TIPS).toContainEqual(result.tip.value)
    app.unmount()
    Math.random.mockRestore()
  })

  test('starting tip is always a valid TIPS member for a mid-range Math.random value', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const { useTipRotation } = await import('@/views/dashboard/tip-card/use-tip-rotation')
    const { TIPS } = await import('@/utils/tips/catalog')

    const [result, app] = withSetup(useTipRotation)
    expect(TIPS).toContainEqual(result.tip.value)
    app.unmount()
    Math.random.mockRestore()
  })
})

// ── Rotation over time ────────────────────────────────────────────────────────

describe('useTipRotation — rotation interval', () => {
  test('advances to the next tip every 30s and wraps back to the start', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { useTipRotation } = await import('@/views/dashboard/tip-card/use-tip-rotation')
    const { TIPS } = await import('@/utils/tips/catalog')

    const [result, app] = withSetup(useTipRotation)
    expect(result.tip.value).toEqual(TIPS[0])

    for (let i = 1; i < TIPS.length; i++) {
      vi.advanceTimersByTime(30000)
      expect(result.tip.value).toEqual(TIPS[i])
    }

    // One more tick wraps back to the first tip
    vi.advanceTimersByTime(30000)
    expect(result.tip.value).toEqual(TIPS[0])

    app.unmount()
    Math.random.mockRestore()
  })
})

// ── Guard against short catalogs ──────────────────────────────────────────────

describe('useTipRotation — TIPS.length guard', () => {
  test('does not create a timer and does not throw for a 1-item catalog', async () => {
    vi.doMock('@/utils/tips/catalog', () => ({
      TIPS: [{ id: 'only', category: 'sound', title_key: 't', body_key: 'b' }]
    }))
    const setIntervalSpy = vi.spyOn(global, 'setInterval')
    const { useTipRotation } = await import('@/views/dashboard/tip-card/use-tip-rotation')

    expect(() => {
      const [, app] = withSetup(useTipRotation)
      app.unmount()
    }).not.toThrow()
    expect(setIntervalSpy).not.toHaveBeenCalled()

    setIntervalSpy.mockRestore()
    vi.doUnmock('@/utils/tips/catalog')
  })

  test('does not create a timer and does not throw for a 0-item catalog', async () => {
    vi.doMock('@/utils/tips/catalog', () => ({ TIPS: [] }))
    const setIntervalSpy = vi.spyOn(global, 'setInterval')
    const { useTipRotation } = await import('@/views/dashboard/tip-card/use-tip-rotation')

    expect(() => {
      const [, app] = withSetup(useTipRotation)
      app.unmount()
    }).not.toThrow()
    expect(setIntervalSpy).not.toHaveBeenCalled()

    setIntervalSpy.mockRestore()
    vi.doUnmock('@/utils/tips/catalog')
  })
})

// ── Cleanup on unmount ─────────────────────────────────────────────────────────

describe('useTipRotation — clears interval on unmount', () => {
  test('tip index does not change after unmount, even if timers keep advancing', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { useTipRotation } = await import('@/views/dashboard/tip-card/use-tip-rotation')
    const { TIPS } = await import('@/utils/tips/catalog')

    const [result, app] = withSetup(useTipRotation)
    vi.advanceTimersByTime(30000)
    expect(result.tip.value).toEqual(TIPS[1])

    app.unmount()
    const tipAtUnmount = result.tip.value

    vi.advanceTimersByTime(30000 * 5)
    expect(result.tip.value).toEqual(tipAtUnmount)

    Math.random.mockRestore()
  })
})

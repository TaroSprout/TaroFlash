import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp } from 'vue'
import { usePerfOverlay } from '@/composables/dev/use-perf-overlay'
import { PERF_BUDGET } from '@/utils/motion/perf-budget'

const { mockStart, mockStop, mockSnapshot, mockScanPerf } = vi.hoisted(() => ({
  mockStart: vi.fn(),
  mockStop: vi.fn(),
  mockSnapshot: vi.fn(() => ({ frameMs: 5, droppedFrames: 1 })),
  mockScanPerf: vi.fn(() => ({ onScreenElementCount: 10, standingEffectAreaRatio: 0.1 }))
}))

vi.mock('@/utils/motion/frame-monitor', () => ({
  FrameMonitor: vi.fn().mockImplementation(function FrameMonitor() {
    this.start = mockStart
    this.stop = mockStop
    this.snapshot = mockSnapshot
  })
}))

vi.mock('@/utils/motion/perf-scan', () => ({
  scanPerf: mockScanPerf
}))

// ── Host app ──────────────────────────────────────────────────────────────────
// usePerfOverlay relies on onMounted/onBeforeUnmount, so it needs a real
// component context to fire either hook.

let app
let result

function mountHost() {
  app = createApp({
    setup() {
      result = usePerfOverlay()
      return () => null
    }
  })
  app.mount(document.createElement('div'))
}

beforeEach(() => {
  vi.useFakeTimers()
  mockStart.mockClear()
  mockStop.mockClear()
  mockSnapshot.mockClear()
  mockScanPerf.mockClear()
})

afterEach(() => {
  app?.unmount()
  vi.useRealTimers()
})

describe('usePerfOverlay', () => {
  test('exposes PERF_BUDGET as the returned budget', () => {
    mountHost()

    expect(result.budget).toBe(PERF_BUDGET)
  })

  test('starts the frame monitor on mount without scanning immediately', () => {
    mountHost()

    expect(mockStart).toHaveBeenCalledTimes(1)
    expect(mockScanPerf).not.toHaveBeenCalled()
  })

  test('scans on the periodic interval and writes both readings into state', () => {
    mountHost()

    vi.advanceTimersByTime(500)

    expect(mockSnapshot).toHaveBeenCalledTimes(1)
    expect(mockScanPerf).toHaveBeenCalledTimes(1)
    expect(result.state).toMatchObject({
      frameMs: 5,
      droppedFrames: 1,
      onScreenElementCount: 10,
      standingEffectAreaRatio: 0.1
    })

    vi.advanceTimersByTime(500)
    expect(mockSnapshot).toHaveBeenCalledTimes(2)
  })

  test('stops the frame monitor and clears the interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
    mountHost()
    vi.advanceTimersByTime(500)

    app.unmount()

    expect(mockStop).toHaveBeenCalledTimes(1)
    expect(clearIntervalSpy).toHaveBeenCalled()

    mockScanPerf.mockClear()
    vi.advanceTimersByTime(1000)
    expect(mockScanPerf).not.toHaveBeenCalled()
  })
})

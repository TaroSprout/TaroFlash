import { describe, test, expect } from 'vite-plus/test'
import {
  PERF_BUDGET,
  PERF_WARN_RATIO,
  PERF_DANGER_RATIO,
  PERF_FPS_WARN,
  PERF_FPS_DANGER
} from '@/utils/motion/perf-budget'

describe('perf-budget', () => {
  test('exposes the frame and element budgets the overlay reads', () => {
    expect(PERF_BUDGET).toEqual({ frameMs: 16.7, maxOnScreenElements: 1200 })
  })

  test('exposes the ratio and fps severity thresholds', () => {
    expect(PERF_WARN_RATIO).toBe(0.5)
    expect(PERF_DANGER_RATIO).toBe(0.75)
    expect(PERF_FPS_WARN).toBe(55)
    expect(PERF_FPS_DANGER).toBe(45)
  })

  test('no longer exposes the retired standing-effect area budget', () => {
    expect(PERF_BUDGET.maxStandingEffectAreaRatio).toBeUndefined()
  })
})

import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { mockUseMotionStore } = vi.hoisted(() => ({
  mockUseMotionStore: vi.fn(() => ({ factors: { height_tween_budget: 4 } }))
}))

vi.mock('@/stores/motion', () => ({ useMotionStore: mockUseMotionStore }))

let reserveHeightTween

beforeEach(async () => {
  vi.resetModules() // reservations live in module-level state, so each test gets a fresh module
  mockUseMotionStore.mockReturnValue({ factors: { height_tween_budget: 4 } })
  ;({ reserveHeightTween } = await import('@/components/layout-kit/stage/height-budget'))
})

describe('reserveHeightTween', () => {
  test('hands out releases up to the tier budget', () => {
    const releases = Array.from({ length: 4 }, () => reserveHeightTween())

    expect(releases.every((release) => typeof release === 'function')).toBe(true)
  })

  test('returns null once the budget is spent', () => {
    for (let i = 0; i < 4; i++) reserveHeightTween()

    expect(reserveHeightTween()).toBeNull()
  })

  test('returns null whenever the budget is 0', () => {
    mockUseMotionStore.mockReturnValue({ factors: { height_tween_budget: 0 } })

    expect(reserveHeightTween()).toBeNull()
  })

  test('release is idempotent and returns a slot to the budget', () => {
    mockUseMotionStore.mockReturnValue({ factors: { height_tween_budget: 1 } })
    const release = reserveHeightTween()
    expect(reserveHeightTween()).toBeNull()

    release()
    release()

    expect(reserveHeightTween()).not.toBeNull()
    expect(reserveHeightTween()).toBeNull()
  })
})

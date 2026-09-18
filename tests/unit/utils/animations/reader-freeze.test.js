import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { mockSet, mockTo, mockKillTweensOf, mockUseMotionStore } = vi.hoisted(() => ({
  mockSet: vi.fn(),
  mockTo: vi.fn(() => ({})),
  mockKillTweensOf: vi.fn(),
  mockUseMotionStore: vi.fn()
}))

vi.mock('gsap', () => ({
  gsap: {
    set: mockSet,
    to: mockTo,
    killTweensOf: mockKillTweensOf
  }
}))

vi.mock('@/stores/motion', () => ({ useMotionStore: mockUseMotionStore }))

import {
  freezeMotionSafe,
  primeFreeze,
  scaleFreeze,
  settleFreeze
} from '@/utils/animations/reader-freeze'

function makeSurface() {
  return document.createElement('div')
}

describe('freezeMotionSafe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('true when the member has not opted into reduced motion', () => {
    mockUseMotionStore.mockReturnValue({ prefers_reduced_motion: false })

    expect(freezeMotionSafe()).toBe(true)
  })

  test('false when the member prefers reduced motion', () => {
    mockUseMotionStore.mockReturnValue({ prefers_reduced_motion: true })

    expect(freezeMotionSafe()).toBe(false)
  })
})

describe('primeFreeze', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('kills any running tween and pins width, blur, and identity scale', () => {
    const surface = makeSurface()

    primeFreeze(surface, 320)

    expect(mockKillTweensOf).toHaveBeenCalledWith(surface)
    expect(mockSet).toHaveBeenCalledWith(surface, {
      width: 320,
      transformOrigin: '0 0',
      filter: 'blur(3px)',
      scaleX: 1,
      scaleY: 1
    })
  })
})

describe('scaleFreeze', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('sets scaleX/scaleY directly, no tween', () => {
    const surface = makeSurface()

    scaleFreeze(surface, 1.2, 0.8)

    expect(mockSet).toHaveBeenCalledWith(surface, { scaleX: 1.2, scaleY: 0.8 })
    expect(mockTo).not.toHaveBeenCalled()
  })
})

describe('settleFreeze', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('clears the pinned width and eases the surface back to identity scale with a blur reveal', async () => {
    const surface = makeSurface()

    const done = settleFreeze(surface)

    expect(mockKillTweensOf).toHaveBeenCalledWith(surface)
    expect(mockSet).toHaveBeenCalledWith(surface, { clearProps: 'width' })
    expect(surface.style.filter).toBe('blur(0px)')
    expect(surface.style.transition).toContain('filter')

    const [target, config] = mockTo.mock.calls[0]
    expect(target).toBe(surface)
    expect(config).toMatchObject({ scaleX: 1, scaleY: 1, duration: 0.32, ease: 'power1.out' })

    config.onComplete()
    await done

    expect(mockSet).toHaveBeenCalledWith(surface, { clearProps: 'transform,transformOrigin' })
    expect(surface.style.transition).toBe('')
    expect(surface.style.filter).toBe('')
  })
})

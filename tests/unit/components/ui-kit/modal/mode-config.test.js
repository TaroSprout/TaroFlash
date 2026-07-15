import { describe, test, expect, vi } from 'vite-plus/test'

const {
  mockSlideUpFadeIn,
  mockSlideDownFadeOut,
  mockSlideUpFromEdge,
  mockSlideDownToEdge,
  mockSpringScaleIn,
  mockScaleFadeOut
} = vi.hoisted(() => ({
  mockSlideUpFadeIn: vi.fn(),
  mockSlideDownFadeOut: vi.fn(),
  mockSlideUpFromEdge: vi.fn(),
  mockSlideDownToEdge: vi.fn(),
  mockSpringScaleIn: vi.fn(),
  mockScaleFadeOut: vi.fn()
}))

vi.mock('@/utils/animations/modal', () => ({
  slideUpFadeIn: mockSlideUpFadeIn,
  slideDownFadeOut: mockSlideDownFadeOut,
  slideUpFromEdge: mockSlideUpFromEdge,
  slideDownToEdge: mockSlideDownToEdge,
  springScaleIn: mockSpringScaleIn,
  scaleFadeOut: mockScaleFadeOut
}))

import { MODAL_MODE_CONFIG } from '@/components/ui-kit/modal/mode-config'

function reset() {
  mockSlideUpFadeIn.mockClear()
  mockSlideDownFadeOut.mockClear()
  mockSlideUpFromEdge.mockClear()
  mockSlideDownToEdge.mockClear()
  mockSpringScaleIn.mockClear()
  mockScaleFadeOut.mockClear()
}

describe('MODAL_MODE_CONFIG — dialog', () => {
  test('enter always uses slideUpFadeIn regardless of is_mobile', () => {
    reset()
    const el = document.createElement('div')
    const done = vi.fn()

    MODAL_MODE_CONFIG.dialog.enter(el, true, done)
    expect(mockSlideUpFadeIn).toHaveBeenCalledWith(el, done)

    reset()
    MODAL_MODE_CONFIG.dialog.enter(el, false, done)
    expect(mockSlideUpFadeIn).toHaveBeenCalledWith(el, done)
  })

  test('leave always uses slideDownFadeOut regardless of is_mobile', () => {
    reset()
    const el = document.createElement('div')
    const done = vi.fn()

    MODAL_MODE_CONFIG.dialog.leave(el, true, done)
    expect(mockSlideDownFadeOut).toHaveBeenCalledWith(el, done)
  })

  test('containerClass centers items', () => {
    expect(MODAL_MODE_CONFIG.dialog.containerClass).toBe('items-center')
  })
})

describe('MODAL_MODE_CONFIG — mobile-sheet', () => {
  test('enter uses slideUpFromEdge when is_mobile is true', () => {
    reset()
    const el = document.createElement('div')
    const done = vi.fn()

    MODAL_MODE_CONFIG['mobile-sheet'].enter(el, true, done)

    expect(mockSlideUpFromEdge).toHaveBeenCalledWith(el, done)
    expect(mockSlideUpFadeIn).not.toHaveBeenCalled()
  })

  test('enter uses slideUpFadeIn when is_mobile is false', () => {
    reset()
    const el = document.createElement('div')
    const done = vi.fn()

    MODAL_MODE_CONFIG['mobile-sheet'].enter(el, false, done)

    expect(mockSlideUpFadeIn).toHaveBeenCalledWith(el, done)
    expect(mockSlideUpFromEdge).not.toHaveBeenCalled()
  })

  test('leave uses slideDownToEdge when is_mobile is true', () => {
    reset()
    const el = document.createElement('div')
    const done = vi.fn()

    MODAL_MODE_CONFIG['mobile-sheet'].leave(el, true, done)

    expect(mockSlideDownToEdge).toHaveBeenCalledWith(el, done)
  })

  test('leave uses slideDownFadeOut when is_mobile is false', () => {
    reset()
    const el = document.createElement('div')
    const done = vi.fn()

    MODAL_MODE_CONFIG['mobile-sheet'].leave(el, false, done)

    expect(mockSlideDownFadeOut).toHaveBeenCalledWith(el, done)
  })
})

describe('MODAL_MODE_CONFIG — popup', () => {
  test('enter always uses springScaleIn regardless of is_mobile', () => {
    reset()
    const el = document.createElement('div')
    const done = vi.fn()

    MODAL_MODE_CONFIG.popup.enter(el, true, done)
    expect(mockSpringScaleIn).toHaveBeenCalledWith(el, done)
  })

  test('leave always uses scaleFadeOut regardless of is_mobile', () => {
    reset()
    const el = document.createElement('div')
    const done = vi.fn()

    MODAL_MODE_CONFIG.popup.leave(el, true, done)
    expect(mockScaleFadeOut).toHaveBeenCalledWith(el, done)
  })
})

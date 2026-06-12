import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { mockFromTo, mockTo } = vi.hoisted(() => ({
  mockFromTo: vi.fn(),
  mockTo: vi.fn()
}))

vi.mock('gsap', () => ({
  default: {
    fromTo: mockFromTo,
    to: mockTo
  }
}))

import { popInPreview, popOutPreview } from '@/utils/animations/selection-preview'

describe('popInPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('calls gsap.fromTo on the element', () => {
    const el = document.createElement('div')
    popInPreview(el)

    expect(mockFromTo).toHaveBeenCalledTimes(1)
    expect(mockFromTo.mock.calls[0][0]).toBe(el)
  })

  test('starts from opacity 0, scale 0.8', () => {
    const el = document.createElement('div')
    popInPreview(el)

    const fromVars = mockFromTo.mock.calls[0][1]
    expect(fromVars).toMatchObject({ opacity: 0, scale: 0.8 })
  })

  test('animates to opacity 1, scale 1', () => {
    const el = document.createElement('div')
    popInPreview(el)

    const toVars = mockFromTo.mock.calls[0][2]
    expect(toVars).toMatchObject({ opacity: 1, scale: 1 })
  })

  test('calls onComplete callback when provided', () => {
    const el = document.createElement('div')
    const onComplete = vi.fn()
    popInPreview(el, onComplete)

    const toVars = mockFromTo.mock.calls[0][2]
    toVars.onComplete?.()
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  test('works without an onComplete callback (no crash)', () => {
    const el = document.createElement('div')
    expect(() => popInPreview(el)).not.toThrow()
  })
})

describe('popOutPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('calls gsap.to on the element', () => {
    const el = document.createElement('div')
    popOutPreview(el)

    expect(mockTo).toHaveBeenCalledTimes(1)
    expect(mockTo.mock.calls[0][0]).toBe(el)
  })

  test('animates to opacity 0, scale 0.8', () => {
    const el = document.createElement('div')
    popOutPreview(el)

    const toVars = mockTo.mock.calls[0][1]
    expect(toVars).toMatchObject({ opacity: 0, scale: 0.8 })
  })

  test('calls onComplete callback when provided', () => {
    const el = document.createElement('div')
    const onComplete = vi.fn()
    popOutPreview(el, onComplete)

    const toVars = mockTo.mock.calls[0][1]
    toVars.onComplete?.()
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  test('works without an onComplete callback (no crash)', () => {
    const el = document.createElement('div')
    expect(() => popOutPreview(el)).not.toThrow()
  })
})

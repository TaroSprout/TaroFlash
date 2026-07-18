import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { mockSet, mockTo } = vi.hoisted(() => ({
  mockSet: vi.fn(),
  mockTo: vi.fn((_el, opts) => opts.onComplete?.())
}))

vi.mock('gsap', () => ({
  gsap: { set: mockSet, to: mockTo }
}))

import { retractAside, restoreAside, snapAside } from '@/utils/animations/aside-retract'

beforeEach(() => {
  vi.clearAllMocks()
  mockTo.mockImplementation((_el, opts) => opts.onComplete?.())
})

function elWithWidth(width) {
  const el = document.createElement('div')
  Object.defineProperty(el, 'offsetWidth', { value: width, configurable: true })
  return el
}

// ── margin collapses instantly, never tweens [obligation] ──────────────────────

describe('retractAside — the negative margin is set instantly, never tweened [obligation]', () => {
  test('applies marginRight via gsap.set, not gsap.to', async () => {
    const el = elWithWidth(120)
    await retractAside(el)

    expect(mockSet).toHaveBeenCalledWith(el, { marginRight: -120, x: -120 })
  })

  test('the tween only animates x/opacity — marginRight never appears in a gsap.to call', async () => {
    const el = elWithWidth(120)
    await retractAside(el)

    for (const [, opts] of mockTo.mock.calls) {
      expect(opts).not.toHaveProperty('marginRight')
    }
    expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ x: 0, autoAlpha: 0 }))
  })

  test('resolves once the tween completes', async () => {
    let resolveTween
    mockTo.mockImplementation((_el, opts) => {
      resolveTween = () => opts.onComplete()
    })
    const el = elWithWidth(80)

    let resolved = false
    retractAside(el).then(() => (resolved = true))
    await Promise.resolve()
    expect(resolved).toBe(false)

    resolveTween()
    await Promise.resolve()
    expect(resolved).toBe(true)
  })
})

describe('restoreAside — reverse of retractAside, margin restored instantly at the end [obligation]', () => {
  test('tweens x back in and opacity to 1, without touching marginRight in the tween', async () => {
    const el = elWithWidth(100)
    await restoreAside(el)

    const [, opts] = mockTo.mock.calls[0]
    expect(opts).not.toHaveProperty('marginRight')
    expect(opts).toMatchObject({ x: -100, autoAlpha: 1 })
  })

  test('clears the margin/transform/visibility/opacity via gsap.set once the tween completes', async () => {
    const el = elWithWidth(100)
    await restoreAside(el)

    expect(mockSet).toHaveBeenCalledWith(el, {
      clearProps: 'transform,visibility,opacity,marginRight'
    })
  })

  test('resolves only after the clearProps set runs', async () => {
    let resolveTween
    mockTo.mockImplementation((_el, opts) => {
      resolveTween = () => opts.onComplete()
    })
    const el = elWithWidth(60)

    let resolved = false
    restoreAside(el).then(() => (resolved = true))
    await Promise.resolve()
    expect(resolved).toBe(false)

    resolveTween()
    await Promise.resolve()
    expect(resolved).toBe(true)
    expect(mockSet).toHaveBeenCalledWith(
      el,
      expect.objectContaining({ clearProps: expect.any(String) })
    )
  })
})

describe('snapAside — jumps straight to a pose with no animation', () => {
  test('retracted=true sets the collapsed margin, zero x offset, and hides it', () => {
    const el = elWithWidth(90)
    snapAside(el, true)

    expect(mockSet).toHaveBeenCalledWith(el, { marginRight: -90, x: 0, autoAlpha: 0 })
    expect(mockTo).not.toHaveBeenCalled()
  })

  test('retracted=false clears every prop this module ever sets', () => {
    const el = elWithWidth(90)
    snapAside(el, false)

    expect(mockSet).toHaveBeenCalledWith(el, {
      clearProps: 'transform,visibility,opacity,marginRight'
    })
  })
})

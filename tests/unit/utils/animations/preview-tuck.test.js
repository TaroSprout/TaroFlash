import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Hoisted gsap mock ──────────────────────────────────────────────────────────
// Each `gsap.timeline()` call gets its own fake timeline so tests can inspect
// exactly which tween carries which onComplete, and fire completion manually
// rather than have it auto-resolve like the simpler `gsap.to` mocks elsewhere.

const { mockGsapSet, makeTimeline, timelines } = vi.hoisted(() => {
  const timelines = []
  function makeTimeline() {
    const calls = { set: [], to: [] }
    let onCompleteCb
    const tl = {
      set: (...args) => {
        calls.set.push(args)
        return tl
      },
      to: (...args) => {
        calls.to.push(args)
        return tl
      },
      eventCallback: (event, cb) => {
        if (event === 'onComplete') onCompleteCb = cb
        return tl
      },
      calls,
      fireOnComplete: () => onCompleteCb?.()
    }
    timelines.push(tl)
    return tl
  }
  return { mockGsapSet: vi.fn(), makeTimeline, timelines }
})

vi.mock('gsap', () => ({
  gsap: {
    timeline: () => makeTimeline(),
    set: mockGsapSet
  }
}))

import {
  tuckPinnedPreview,
  untuckPinnedPreview,
  snapPinnedPreview
} from '@/utils/animations/preview-tuck'

beforeEach(() => {
  vi.clearAllMocks()
  timelines.length = 0
})

function el() {
  return document.createElement('div')
}

// ── onEdgeOn fires at the 90° midpoint, not at completion [obligation] ────────

describe('tuckPinnedPreview / untuckPinnedPreview — onEdgeOn fires at the 90° midpoint [obligation]', () => {
  test('tuckPinnedPreview wires onEdgeOn as the onComplete of the first half-turn tween only', () => {
    const onEdgeOn = vi.fn()
    tuckPinnedPreview(el(), onEdgeOn)

    const tl = timelines[0]
    // First .to() is the 0deg -> 90deg half turn.
    expect(tl.calls.to[0][1].onComplete).toBe(onEdgeOn)
    // The remaining tweens (90->0 turn, pose travel) must not also fire it.
    expect(tl.calls.to[1][1]?.onComplete).toBeUndefined()
    expect(tl.calls.to[2][1]?.onComplete).toBeUndefined()
  })

  test('onEdgeOn firing does not resolve the returned promise — only the full timeline completing does', async () => {
    const onEdgeOn = vi.fn()
    let resolved = false
    tuckPinnedPreview(el(), onEdgeOn).then(() => (resolved = true))

    const tl = timelines[0]
    tl.calls.to[0][1].onComplete()
    await Promise.resolve()
    await Promise.resolve()

    expect(onEdgeOn).toHaveBeenCalledOnce()
    expect(resolved).toBe(false)

    tl.fireOnComplete()
    await Promise.resolve()
    await Promise.resolve()

    expect(resolved).toBe(true)
  })

  test('untuckPinnedPreview wires onEdgeOn the same way as tuckPinnedPreview', () => {
    const onEdgeOn = vi.fn()
    untuckPinnedPreview(el(), onEdgeOn)

    const tl = timelines[0]
    expect(tl.calls.to[0][1].onComplete).toBe(onEdgeOn)
  })
})

// ── pose targets ────────────────────────────────────────────────────────────────

describe('tuckPinnedPreview / untuckPinnedPreview — pose targets', () => {
  test('tuckPinnedPreview travels to the tucked pose (lifted + scaled down)', () => {
    tuckPinnedPreview(el(), vi.fn())
    const tl = timelines[0]
    const [, poseOpts, position] = tl.calls.to[2]

    expect(poseOpts).toMatchObject({ y: -90, scale: 0.85 })
    expect(position).toBe(0)
  })

  test('untuckPinnedPreview travels back to the resting pose', () => {
    untuckPinnedPreview(el(), vi.fn())
    const tl = timelines[0]
    const [, poseOpts] = tl.calls.to[2]

    expect(poseOpts).toMatchObject({ y: 0, scale: 1 })
  })

  test('bakes transformPerspective before the first rotate', () => {
    tuckPinnedPreview(el(), vi.fn())
    const tl = timelines[0]
    expect(tl.calls.set[0][1]).toMatchObject({ transformPerspective: 800 })
  })
})

// ── snapPinnedPreview ────────────────────────────────────────────────────────────

describe('snapPinnedPreview — jumps straight to a pose with no animation', () => {
  test('tucked=true sets the tucked pose + perspective directly, without a timeline', () => {
    const target = el()
    snapPinnedPreview(target, true)

    expect(mockGsapSet).toHaveBeenCalledWith(
      target,
      expect.objectContaining({ y: -90, scale: 0.85, transformPerspective: 800 })
    )
    expect(timelines).toHaveLength(0)
  })

  test('tucked=false clears the transform back to its natural state', () => {
    const target = el()
    snapPinnedPreview(target, false)

    expect(mockGsapSet).toHaveBeenCalledWith(target, { clearProps: 'transform' })
  })
})

import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp, nextTick, ref } from 'vue'
import { useStageHeight } from '@/components/layout-kit/stage/use-stage-height'

class FakeResizeObserver {
  constructor(cb) {
    this.cb = cb
    FakeResizeObserver.instances.push(this)
  }
  observe() {}
  disconnect() {
    this.disconnected = true
  }
}
FakeResizeObserver.instances = []
vi.stubGlobal('ResizeObserver', FakeResizeObserver)

// captures each invocation as a controllable handle so a test can resolve `done` on demand
const { mockMotion, motionHandles } = vi.hoisted(() => {
  const motionHandles = []
  const mockMotion = vi.fn((build) => (el) => {
    const fromTo = vi.fn()
    build(el, { tl: { fromTo }, duration: (v) => v, ease: (v) => v })

    let resolveDone
    const done = new Promise((resolve) => {
      resolveDone = resolve
    })

    const handle = { done, cancel: vi.fn(), finish: vi.fn(), mark: vi.fn(), fromTo, resolveDone }
    motionHandles.push(handle)
    return handle
  })
  return { mockMotion, motionHandles }
})

vi.mock('@/utils/motion/driver', () => ({ motion: mockMotion }))

const { mockReserveHeightTween } = vi.hoisted(() => ({
  mockReserveHeightTween: vi.fn()
}))

vi.mock('@/components/layout-kit/stage/height-budget', () => ({
  reserveHeightTween: mockReserveHeightTween
}))

function makeBox(initial_height) {
  const box = { offsetHeight: initial_height, _natural: initial_height } // offsetHeight returns the pinned value while a height is set, else the natural size
  let height_value = ''

  box.style = {
    overflow: '',
    get height() {
      return height_value
    },
    set height(v) {
      height_value = v
      if (v) box.offsetHeight = parseFloat(v)
    },
    removeProperty(prop) {
      if (prop === 'height') {
        height_value = ''
        box.offsetHeight = box._natural
      } else if (prop === 'overflow') {
        box.style.overflow = ''
      }
    }
  }

  return box
}

function makeContent(offsetHeight) {
  return { offsetHeight }
}

let app

function withSetup(box, content, options) {
  let result
  app = createApp({
    setup() {
      result = useStageHeight(box, content, options)
      return () => {}
    }
  })
  app.mount(document.createElement('div'))
  return result
}

function latestObserver() {
  return FakeResizeObserver.instances.at(-1)
}

function resize(box, content, target_height) {
  box._natural = target_height
  content.value.offsetHeight = target_height
  latestObserver().cb()
}

beforeEach(() => {
  FakeResizeObserver.instances.length = 0
  motionHandles.length = 0
  mockMotion.mockClear()
  mockReserveHeightTween.mockReset()
  mockReserveHeightTween.mockImplementation(() => vi.fn())
})

afterEach(() => {
  app?.unmount()
  app = undefined
})

describe('useStageHeight', () => {
  test('tweens the box height through the motion driver on a content resize', () => {
    const box = ref(makeBox(40))
    const content = ref(makeContent(40))
    withSetup(box, content)

    resize(box.value, content, 80)

    expect(mockMotion).toHaveBeenCalledTimes(1)
    expect(motionHandles[0].fromTo).toHaveBeenCalledWith(
      box.value,
      { height: 40 },
      expect.objectContaining({ height: 80 })
    )
  })

  test('sets overflow hidden while the tween runs and clears it once it completes', async () => {
    const box = ref(makeBox(40))
    const content = ref(makeContent(40))
    withSetup(box, content)

    resize(box.value, content, 80)
    expect(box.value.style.overflow).toBe('hidden')

    motionHandles[0].resolveDone()
    await motionHandles[0].done

    expect(box.value.style.overflow).toBe('')
  })

  test('snaps instead of tweening when the budget has no free slot', () => {
    mockReserveHeightTween.mockReturnValue(null)
    const box = ref(makeBox(40))
    const content = ref(makeContent(40))
    withSetup(box, content)

    resize(box.value, content, 80)

    expect(mockMotion).not.toHaveBeenCalled()
    expect(box.value.style.overflow).toBe('')
    expect(box.value.offsetHeight).toBe(80)
  })

  test('a second resize replaces the in-flight tween rather than stacking it', () => {
    const box = ref(makeBox(40))
    const content = ref(makeContent(40))
    withSetup(box, content)

    resize(box.value, content, 80)
    const first_handle = motionHandles[0]

    resize(box.value, content, 120)

    expect(first_handle.cancel).toHaveBeenCalledOnce()
    expect(mockMotion).toHaveBeenCalledTimes(2)
  })

  test('claimHeight increments the claim, stands the auto-tween down, and releases idempotently', async () => {
    const box = ref(makeBox(40))
    const content = ref(makeContent(40))
    const { claimHeight } = withSetup(box, content)

    resize(box.value, content, 80)
    const in_flight_handle = motionHandles[0]

    const release = claimHeight()
    await nextTick()

    expect(in_flight_handle.cancel).toHaveBeenCalledOnce()
    expect(box.value.style.overflow).toBe('')

    resize(box.value, content, 120) // claimed — the box's own resize tween stands down
    expect(mockMotion).toHaveBeenCalledTimes(1)

    release()
    release()

    resize(box.value, content, 160) // released — a subsequent resize tweens again
    expect(mockMotion).toHaveBeenCalledTimes(2)
  })

  test('unmount cancels the in-flight tween and releases its reserved budget slot', () => {
    const release_budget = vi.fn()
    mockReserveHeightTween.mockReturnValue(release_budget)

    const box = ref(makeBox(40))
    const content = ref(makeContent(40))
    withSetup(box, content)

    resize(box.value, content, 80)
    const handle = motionHandles[0]

    app.unmount()

    expect(handle.cancel).toHaveBeenCalledOnce()
    expect(release_budget).toHaveBeenCalledOnce()
  })

  describe('active gate', () => {
    test('an inactive resize records the baseline without tweening; a real active change then tweens', () => {
      let is_active = false
      const box = ref(makeBox(40))
      const content = ref(makeContent(40))
      withSetup(box, content, { active: () => is_active })

      resize(box.value, content, 80) // inactive — baseline recorded, no tween
      expect(mockMotion).not.toHaveBeenCalled()

      is_active = true
      resize(box.value, content, 80) // same size as the recorded baseline — still no tween
      expect(mockMotion).not.toHaveBeenCalled()

      resize(box.value, content, 120) // a genuine change while active — tweens now
      expect(mockMotion).toHaveBeenCalledOnce()
    })
  })

  describe('onSettled', () => {
    test('fires once after a tween settles', async () => {
      const onSettled = vi.fn()
      const box = ref(makeBox(40))
      const content = ref(makeContent(40))
      withSetup(box, content, { onSettled })

      resize(box.value, content, 80)
      expect(onSettled).not.toHaveBeenCalled()

      motionHandles[0].resolveDone()
      await motionHandles[0].done

      expect(onSettled).toHaveBeenCalledOnce()
    })

    test('fires once on the budget-null snap path', () => {
      mockReserveHeightTween.mockReturnValue(null)
      const onSettled = vi.fn()
      const box = ref(makeBox(40))
      const content = ref(makeContent(40))
      withSetup(box, content, { onSettled })

      resize(box.value, content, 80)

      expect(mockMotion).not.toHaveBeenCalled()
      expect(onSettled).toHaveBeenCalledOnce()
    })

    test('does not fire after unmount, even once the cancelled tween resolves', async () => {
      const onSettled = vi.fn()
      const box = ref(makeBox(40))
      const content = ref(makeContent(40))
      withSetup(box, content, { onSettled })

      resize(box.value, content, 80)
      const handle = motionHandles[0]

      app.unmount()
      handle.resolveDone()
      await handle.done

      expect(onSettled).not.toHaveBeenCalled()
    })

    test('fires only for the surviving tween when a resize supersedes an in-flight one', async () => {
      const onSettled = vi.fn()
      const box = ref(makeBox(40))
      const content = ref(makeContent(40))
      withSetup(box, content, { onSettled })

      resize(box.value, content, 80)
      const first = motionHandles[0]

      resize(box.value, content, 120) // supersedes the first, bumping the generation
      const second = motionHandles[1]

      first.resolveDone()
      await first.done
      expect(onSettled).not.toHaveBeenCalled() // stale generation — no settle

      second.resolveDone()
      await second.done
      expect(onSettled).toHaveBeenCalledOnce()
    })
  })

  describe('driveHeight', () => {
    test('tweens from the current height to the target with the caller-supplied duration and ease', () => {
      const box = ref(makeBox(40))
      const content = ref(makeContent(40))
      const { driveHeight } = withSetup(box, content)

      driveHeight(120, { duration: 0.42, ease: 'power2.out' })

      expect(motionHandles[0].fromTo).toHaveBeenCalledWith(
        box.value,
        { height: 40 },
        expect.objectContaining({ height: 120, duration: 0.42, ease: 'power2.out' })
      )
    })

    test('a second driveHeight cancels the first handle and starts exactly one new tween', () => {
      const box = ref(makeBox(40))
      const content = ref(makeContent(40))
      const { driveHeight } = withSetup(box, content)

      driveHeight(120, { duration: 0.3, ease: 'linear' })
      const first_handle = motionHandles[0]

      driveHeight(200, { duration: 0.3, ease: 'linear' })

      expect(first_handle.cancel).toHaveBeenCalledOnce()
      expect(mockMotion).toHaveBeenCalledTimes(2)
    })

    test('cancel() cancels the in-flight handle without starting a new tween', () => {
      const box = ref(makeBox(40))
      const content = ref(makeContent(40))
      const { driveHeight } = withSetup(box, content)

      const { cancel } = driveHeight(120, { duration: 0.3, ease: 'linear' })
      const handle = motionHandles[0]

      cancel()

      expect(handle.cancel).toHaveBeenCalledOnce()
      expect(mockMotion).toHaveBeenCalledTimes(1)
    })

    test('settled resolves once the tween completes', async () => {
      const box = ref(makeBox(40))
      const content = ref(makeContent(40))
      const { driveHeight } = withSetup(box, content)

      const { settled } = driveHeight(120, { duration: 0.3, ease: 'linear' })
      const handle = motionHandles[0]

      handle.resolveDone()
      await settled

      expect(box.value.style.overflow).toBe('')
    })

    test('settled resolves for a change superseded by a newer driveHeight', async () => {
      const box = ref(makeBox(40))
      const content = ref(makeContent(40))
      const { driveHeight } = withSetup(box, content)

      const { settled: first_settled } = driveHeight(120, { duration: 0.3, ease: 'linear' })
      driveHeight(200, { duration: 0.3, ease: 'linear' })

      await first_settled
    })

    test('settled resolves when cancel() is called', async () => {
      const box = ref(makeBox(40))
      const content = ref(makeContent(40))
      const { driveHeight } = withSetup(box, content)

      const { settled, cancel } = driveHeight(120, { duration: 0.3, ease: 'linear' })
      cancel()

      await settled
    })

    test('settled resolves when the component unmounts mid-tween', async () => {
      const box = ref(makeBox(40))
      const content = ref(makeContent(40))
      const { driveHeight } = withSetup(box, content)

      const { settled } = driveHeight(120, { duration: 0.3, ease: 'linear' })
      app.unmount()

      await settled
    })

    test('pins the height to the target immediately and resolves settled when the budget has no free slot', async () => {
      mockReserveHeightTween.mockReturnValue(null)
      const box = ref(makeBox(40))
      const content = ref(makeContent(40))
      const { driveHeight } = withSetup(box, content)

      const { settled } = driveHeight(120, { duration: 0.3, ease: 'linear' })

      expect(mockMotion).not.toHaveBeenCalled()
      expect(box.value.offsetHeight).toBe(120)

      await settled
    })

    test("a superseded change's cancel() is a no-op that leaves the live change untouched", () => {
      const box = ref(makeBox(40))
      const content = ref(makeContent(40))
      const { driveHeight } = withSetup(box, content)

      const { cancel: cancel_first } = driveHeight(120, { duration: 0.3, ease: 'linear' })
      driveHeight(200, { duration: 0.3, ease: 'linear' })
      const second_handle = motionHandles[1]

      cancel_first()

      expect(second_handle.cancel).not.toHaveBeenCalled()
      expect(mockMotion).toHaveBeenCalledTimes(2)
    })

    test('resolves settled immediately with no tween or budget reservation when the target equals the current height', async () => {
      const box = ref(makeBox(120))
      const content = ref(makeContent(120))
      const { driveHeight } = withSetup(box, content)

      const { settled } = driveHeight(120, { duration: 0.3, ease: 'linear' })

      expect(mockMotion).not.toHaveBeenCalled()
      expect(mockReserveHeightTween).not.toHaveBeenCalled()

      await settled
    })
  })

  describe('driveWidth', () => {
    // Mirrors makeBox, but pins offsetWidth instead of offsetHeight.
    function makeWidthBox(initial_width) {
      const box = { offsetWidth: initial_width }
      let width_value = ''

      box.style = {
        overflow: '',
        get width() {
          return width_value
        },
        set width(v) {
          width_value = v
          if (v) box.offsetWidth = parseFloat(v)
        },
        removeProperty(prop) {
          if (prop === 'width') {
            width_value = ''
          } else if (prop === 'overflow') {
            box.style.overflow = ''
          }
        }
      }

      return box
    }

    test('tweens from the current width to the target with the caller-supplied duration and ease', () => {
      const box = ref(makeWidthBox(40))
      const content = ref(makeContent(40))
      const { driveWidth } = withSetup(box, content)

      driveWidth(120, { duration: 0.3, ease: 'power3.out' })

      expect(motionHandles[0].fromTo).toHaveBeenCalledWith(
        box.value,
        { width: 40 },
        expect.objectContaining({ width: 120, duration: 0.3, ease: 'power3.out' })
      )
    })

    test('a second driveWidth cancels the first handle and starts exactly one new tween', () => {
      const box = ref(makeWidthBox(40))
      const content = ref(makeContent(40))
      const { driveWidth } = withSetup(box, content)

      driveWidth(120, { duration: 0.3, ease: 'power3.out' })
      const first_handle = motionHandles[0]

      driveWidth(200, { duration: 0.3, ease: 'power3.out' })

      expect(first_handle.cancel).toHaveBeenCalledOnce()
      expect(mockMotion).toHaveBeenCalledTimes(2)
    })

    test('a driveHeight call also supersedes an in-flight driveWidth handle', () => {
      const box = ref(makeWidthBox(40))
      const content = ref(makeContent(40))
      const { driveWidth, driveHeight } = withSetup(box, content)

      driveWidth(120, { duration: 0.3, ease: 'power3.out' })
      const first_handle = motionHandles[0]

      driveHeight(200, { duration: 0.3, ease: 'linear' })

      expect(first_handle.cancel).toHaveBeenCalledOnce()
      expect(mockMotion).toHaveBeenCalledTimes(2)
    })

    test('cancel() cancels the in-flight handle without starting a new tween', () => {
      const box = ref(makeWidthBox(40))
      const content = ref(makeContent(40))
      const { driveWidth } = withSetup(box, content)

      const { cancel } = driveWidth(120, { duration: 0.3, ease: 'power3.out' })
      const handle = motionHandles[0]

      cancel()

      expect(handle.cancel).toHaveBeenCalledOnce()
      expect(mockMotion).toHaveBeenCalledTimes(1)
    })

    test('settled resolves once the tween completes', async () => {
      const box = ref(makeWidthBox(40))
      const content = ref(makeContent(40))
      const { driveWidth } = withSetup(box, content)

      const { settled } = driveWidth(120, { duration: 0.3, ease: 'power3.out' })
      const handle = motionHandles[0]

      handle.resolveDone()
      await settled

      expect(box.value.style.overflow).toBe('')
    })

    test('settled resolves for a change superseded by a newer driveWidth', async () => {
      const box = ref(makeWidthBox(40))
      const content = ref(makeContent(40))
      const { driveWidth } = withSetup(box, content)

      const { settled: first_settled } = driveWidth(120, { duration: 0.3, ease: 'power3.out' })
      driveWidth(200, { duration: 0.3, ease: 'power3.out' })

      await first_settled
    })

    test('settled resolves when cancel() is called', async () => {
      const box = ref(makeWidthBox(40))
      const content = ref(makeContent(40))
      const { driveWidth } = withSetup(box, content)

      const { settled, cancel } = driveWidth(120, { duration: 0.3, ease: 'power3.out' })
      cancel()

      await settled
    })

    test('settled resolves when the component unmounts mid-tween', async () => {
      const box = ref(makeWidthBox(40))
      const content = ref(makeContent(40))
      const { driveWidth } = withSetup(box, content)

      const { settled } = driveWidth(120, { duration: 0.3, ease: 'power3.out' })
      app.unmount()

      await settled
    })

    test('snaps by setting style.width directly and resolves settled when the budget has no free slot', async () => {
      mockReserveHeightTween.mockReturnValue(null)
      const box = ref(makeWidthBox(40))
      const content = ref(makeContent(40))
      const { driveWidth } = withSetup(box, content)

      const { settled } = driveWidth(120, { duration: 0.3, ease: 'power3.out' })

      expect(mockMotion).not.toHaveBeenCalled()
      expect(box.value.style.width).toBe('120px')
      expect(mockReserveHeightTween).toHaveBeenCalledOnce()

      await settled
    })

    test('resolves settled immediately with no tween or budget reservation when the target equals the current width', async () => {
      const box = ref(makeWidthBox(120))
      const content = ref(makeContent(120))
      const { driveWidth } = withSetup(box, content)

      const { settled } = driveWidth(120, { duration: 0.3, ease: 'power3.out' })

      expect(mockMotion).not.toHaveBeenCalled()
      expect(mockReserveHeightTween).not.toHaveBeenCalled()

      await settled
    })
  })
})

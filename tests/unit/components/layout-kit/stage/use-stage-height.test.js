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

function withSetup(box, content) {
  let result
  app = createApp({
    setup() {
      result = useStageHeight(box, content)
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
})

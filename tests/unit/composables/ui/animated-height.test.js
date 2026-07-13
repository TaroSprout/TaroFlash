import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp, nextTick, ref } from 'vue'
import { useAnimatedHeight } from '@/composables/ui/animated-height'

// ── ResizeObserver stub ───────────────────────────────────────────────────────
// jsdom does not implement ResizeObserver — stub it and capture the callback so
// tests can trigger a resize recompute manually.

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

// ── GSAP mock ─────────────────────────────────────────────────────────────────

const { mockGsapTo, mockKillTweensOf } = vi.hoisted(() => ({
  mockGsapTo: vi.fn(),
  mockKillTweensOf: vi.fn()
}))

vi.mock('gsap', () => ({
  gsap: {
    to: mockGsapTo,
    killTweensOf: mockKillTweensOf
  }
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEl(offsetHeight) {
  return { offsetHeight, style: {} }
}

let app

// The composable's immediate watch on `content` syncs its internal `last`
// baseline to the ref's current offsetHeight at setup time, so a resize only
// registers as a *change* once content.offsetHeight diverges from that
// baseline. Mutate it in place, then fire the observer callback.
function resizeTo(content, height) {
  content.value.offsetHeight = height
  FakeResizeObserver.instances.at(-1).cb()
}

function withSetup(wrapper, content, active, onSettled, animate) {
  let result
  app = createApp({
    setup() {
      result = useAnimatedHeight(wrapper, content, active, onSettled, animate)
      return () => {}
    }
  })
  app.mount(document.createElement('div'))
  return result
}

function latestObserver() {
  return FakeResizeObserver.instances.at(-1)
}

beforeEach(() => {
  FakeResizeObserver.instances.length = 0
  mockGsapTo.mockReset()
  mockKillTweensOf.mockReset()
})

afterEach(() => {
  app?.unmount()
  app = undefined
})

describe('useAnimatedHeight', () => {
  describe('snap mode (default)', () => {
    test('snaps wrapper.style.height to content.offsetHeight synchronously on resize', () => {
      const wrapper = ref(makeEl(0))
      const content = ref(makeEl(0))
      withSetup(wrapper, content)

      resizeTo(content, 50)

      expect(wrapper.value.style.height).toBe('50px')
    })

    test('resets height to empty string and calls onSettled on the next frame [obligation]', async () => {
      const wrapper = ref(makeEl(0))
      const content = ref(makeEl(0))
      const onSettled = vi.fn()
      withSetup(wrapper, content, () => true, onSettled)

      resizeTo(content, 50)
      expect(wrapper.value.style.height).toBe('50px')

      await new Promise((resolve) => requestAnimationFrame(resolve))

      expect(wrapper.value.style.height).toBe('')
      expect(onSettled).toHaveBeenCalledTimes(1)
    })

    test('does not call gsap.to in snap mode [obligation]', () => {
      const wrapper = ref(makeEl(0))
      const content = ref(makeEl(0))
      withSetup(wrapper, content)

      resizeTo(content, 50)

      expect(mockGsapTo).not.toHaveBeenCalled()
    })

    test('records the resize silently without animating when active() returns false', () => {
      const wrapper = ref(makeEl(0))
      const content = ref(makeEl(0))
      const onSettled = vi.fn()
      withSetup(wrapper, content, () => false, onSettled)

      resizeTo(content, 50)

      expect(wrapper.value.style.height).not.toBe('50px')
      expect(onSettled).not.toHaveBeenCalled()
    })

    test('does not re-trigger when content height is unchanged', () => {
      const wrapper = ref(makeEl(0))
      const content = ref(makeEl(0))
      withSetup(wrapper, content)

      resizeTo(content, 50)
      wrapper.value.style.height = 'untouched'
      latestObserver().cb()

      expect(wrapper.value.style.height).toBe('untouched')
    })
  })

  describe('animate mode', () => {
    test('tweens height via gsap.to with overflow hidden during the tween [obligation]', () => {
      const wrapper = ref(makeEl(0))
      const content = ref(makeEl(0))
      withSetup(wrapper, content, () => true, undefined, true)

      resizeTo(content, 80)

      expect(wrapper.value.style.overflow).toBe('hidden')
      expect(mockGsapTo).toHaveBeenCalledWith(
        wrapper.value,
        expect.objectContaining({ height: 80, duration: expect.any(Number) })
      )
    })

    test('clears overflow and calls onSettled from onComplete [obligation]', () => {
      const wrapper = ref(makeEl(0))
      const content = ref(makeEl(0))
      const onSettled = vi.fn()
      withSetup(wrapper, content, () => true, onSettled, true)

      resizeTo(content, 80)
      const { onComplete } = mockGsapTo.mock.calls[0][1]
      onComplete()

      expect(wrapper.value.style.overflow).toBe('')
      expect(onSettled).toHaveBeenCalledTimes(1)
    })

    test('kills any in-flight tween on the wrapper before starting a new one', () => {
      const wrapper = ref(makeEl(0))
      const content = ref(makeEl(0))
      withSetup(wrapper, content, () => true, undefined, true)

      resizeTo(content, 80)

      expect(mockKillTweensOf).toHaveBeenCalledWith(wrapper.value)
    })
  })

  describe('lifecycle', () => {
    test('disconnects the ResizeObserver on unmount', () => {
      const wrapper = ref(makeEl(0))
      const content = ref(makeEl(50))
      withSetup(wrapper, content)

      const observer = latestObserver()
      app.unmount()

      expect(observer.disconnected).toBe(true)
    })

    test('re-observes a new content element when the content ref changes [obligation]', async () => {
      const wrapper = ref(makeEl(0))
      const content = ref(makeEl(50))
      withSetup(wrapper, content)

      const first_observer = latestObserver()
      content.value = makeEl(90)
      await nextTick()

      expect(first_observer.disconnected).toBe(true)
      expect(latestObserver()).not.toBe(first_observer)
    })

    test('does nothing when content is null', () => {
      const wrapper = ref(makeEl(0))
      const content = ref(null)

      expect(() => withSetup(wrapper, content)).not.toThrow()
    })
  })
})

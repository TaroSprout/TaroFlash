import { describe, test, expect, vi, afterEach, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { h, nextTick, ref } from 'vue'
import CrossfadeResize from '@/components/layout-kit/crossfade-resize.vue'

// ── GSAP mock ─────────────────────────────────────────────────────────────────
// onComplete must fire — <Transition :css="false"> threads `done` through it for
// the fade; if it never fires the transition hangs and after-enter never calls.

vi.mock('gsap', () => ({
  gsap: {
    to: vi.fn((_el, opts) => opts?.onComplete?.()),
    set: vi.fn()
  }
}))

// ── Motion driver + height-budget mocks ────────────────────────────────────────
// driveHeight (from useStageHeight) runs the resize through `motion()` and
// `reserveHeightTween()` — a real height tween never resolves on its own here, a
// test resolves the recorded handle's `done` promise to advance it.

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

// ── Helpers ───────────────────────────────────────────────────────────────────

const PANE_HEIGHT = { a: 40, b: 80, c: 120 }

// Mount CrossfadeResize directly with a reactive slot key. The slot function
// reads `slot_key` inside CrossfadeResize's own render effect, so when the ref
// changes CrossfadeResize itself re-renders and the Transition sees the key
// change — triggering before-leave / after-enter hooks. Each pane gets a
// distinct inline height so the wrapper's offsetHeight actually differs across
// a swap — otherwise `driveHeight`'s `from === target` shortcut never engages.
const mounted_wrappers = []

function makeCrossfadeWrapper(props = {}) {
  const slot_key = ref('a')

  const cr = mount(CrossfadeResize, {
    props,
    slots: {
      default: () =>
        h(
          'div',
          {
            key: slot_key.value,
            'data-testid': `pane-${slot_key.value}`,
            style: { height: `${PANE_HEIGHT[slot_key.value]}px` }
          },
          slot_key.value
        )
    },
    attachTo: document.body,
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      stubs: { Transition: false, transition: false }
    }
  })

  mounted_wrappers.push(cr)
  return { cr, slot_key }
}

afterEach(() => {
  mounted_wrappers.forEach((w) => w.unmount())
  mounted_wrappers.length = 0
})

beforeEach(() => {
  motionHandles.length = 0
  mockMotion.mockClear()
  mockReserveHeightTween.mockReset()
  mockReserveHeightTween.mockImplementation(() => vi.fn())
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CrossfadeResize', () => {
  test('renders root element with data-testid="crossfade-resize"', () => {
    const { cr } = makeCrossfadeWrapper()
    expect(cr.find('[data-testid="crossfade-resize"]').exists()).toBe(true)
  })

  test('renders slotted content', () => {
    const { cr } = makeCrossfadeWrapper()
    expect(cr.find('[data-testid="pane-a"]').exists()).toBe(true)
  })

  test('emits swap-start when the slot content changes (before-leave)', async () => {
    const { cr, slot_key } = makeCrossfadeWrapper()

    slot_key.value = 'b'
    await nextTick()
    await nextTick()

    expect(cr.emitted('swap-start')).toBeTruthy()
  })

  test('emits swap-end once the height drive settles (after-enter)', async () => {
    const { cr, slot_key } = makeCrossfadeWrapper()

    slot_key.value = 'b'
    await nextTick()
    await nextTick()
    await flushPromises()

    expect(motionHandles).toHaveLength(1)
    motionHandles[0].resolveDone()
    await flushPromises()
    await flushPromises()

    expect(cr.emitted('swap-end')).toBeTruthy()
  })

  // ── animateHeight prop ────────────────────────────────────────

  test('animateHeight defaults to true — drives the height via driveHeight (motion + reserveHeightTween), never a raw gsap.set snap', async () => {
    const { slot_key } = makeCrossfadeWrapper()

    slot_key.value = 'b'
    await nextTick()
    await nextTick()
    await flushPromises()

    expect(mockReserveHeightTween).toHaveBeenCalled()
    expect(mockMotion).toHaveBeenCalled()

    motionHandles[0].resolveDone()
    await flushPromises()
  })

  test('animateHeight=false snaps height via gsap.set instead of driving it', async () => {
    const { slot_key } = makeCrossfadeWrapper({ animateHeight: false })

    slot_key.value = 'b'
    await nextTick()
    await nextTick()
    await flushPromises()

    expect(mockMotion).not.toHaveBeenCalled()
    expect(mockReserveHeightTween).not.toHaveBeenCalled()
  })

  // ── Cancellation ───────────────────────────────────────────────

  test('@enter-cancelled invokes the cancel returned from the height drive', async () => {
    const { slot_key } = makeCrossfadeWrapper()

    slot_key.value = 'b'
    await nextTick()
    await nextTick()

    // 'b' is still entering (its driveHeight settled promise hasn't resolved) —
    // swapping again interrupts it and Vue fires enter-cancelled for 'b'.
    slot_key.value = 'c'
    await nextTick()
    await nextTick()
    await flushPromises()

    expect(motionHandles[0].cancel).toHaveBeenCalled()
  })

  test('an interrupted swap leaves no residual inline height/overflow on the wrapper', async () => {
    const { cr, slot_key } = makeCrossfadeWrapper()
    const wrapper_el = cr.find('[data-testid="crossfade-resize"]').element

    slot_key.value = 'b'
    await nextTick()
    await nextTick()

    slot_key.value = 'c'
    await nextTick()
    await nextTick()
    await flushPromises()
    await flushPromises()

    expect(wrapper_el.style.height).toBe('')
    expect(wrapper_el.style.overflow).toBe('')
  })
})

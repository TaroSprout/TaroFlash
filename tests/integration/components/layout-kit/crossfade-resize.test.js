import { describe, test, expect, vi, afterEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { h, nextTick, ref } from 'vue'
import { gsap } from 'gsap'
import CrossfadeResize from '@/components/layout-kit/crossfade-resize.vue'

// ── GSAP mock ─────────────────────────────────────────────────────────────────
// onComplete must fire — <Transition :css="false"> threads `done` through it;
// if it never fires the transition hangs and after-enter never calls.

vi.mock('gsap', () => ({
  gsap: {
    to: vi.fn((_el, opts) => opts?.onComplete?.()),
    set: vi.fn(),
    // .to() is chainable; onComplete fires once both tweens are queued so the
    // timeline-driven (animateHeight) path completes synchronously like `to`.
    timeline: vi.fn((opts) => {
      const timeline = {
        to: () => timeline
      }
      opts?.onComplete?.()
      return timeline
    })
  }
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

// Mount CrossfadeResize directly with a reactive slot key. The slot function
// reads `slot_key` inside CrossfadeResize's own render effect, so when the ref
// changes CrossfadeResize itself re-renders and the Transition sees the key
// change — triggering before-leave / after-enter hooks.
const mounted_wrappers = []

function makeCrossfadeWrapper(props = {}) {
  const slot_key = ref('a')

  const cr = mount(CrossfadeResize, {
    props,
    slots: {
      default: () =>
        h('div', { key: slot_key.value, 'data-testid': `pane-${slot_key.value}` }, slot_key.value)
    },
    attachTo: document.body,
    global: { stubs: { Transition: false, transition: false } }
  })

  mounted_wrappers.push(cr)
  return { cr, slot_key }
}

afterEach(() => {
  mounted_wrappers.forEach((w) => w.unmount())
  mounted_wrappers.length = 0
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CrossfadeResize', () => {
  test('renders root element with data-testid="crossfade-resize" [obligation]', () => {
    const { cr } = makeCrossfadeWrapper()
    expect(cr.find('[data-testid="crossfade-resize"]').exists()).toBe(true)
  })

  test('renders slotted content [obligation]', () => {
    const { cr } = makeCrossfadeWrapper()
    expect(cr.find('[data-testid="pane-a"]').exists()).toBe(true)
  })

  test('emits swap-start when the slot content changes (before-leave) [obligation]', async () => {
    const { cr, slot_key } = makeCrossfadeWrapper()

    slot_key.value = 'b'
    await nextTick()
    await nextTick()
    await flushPromises()

    expect(cr.emitted('swap-start')).toBeTruthy()
  })

  test('emits swap-end after the enter transition completes (after-enter) [obligation]', async () => {
    const { cr, slot_key } = makeCrossfadeWrapper()

    slot_key.value = 'b'
    await nextTick()
    await nextTick()
    await flushPromises()

    expect(cr.emitted('swap-end')).toBeTruthy()
  })

  test('both swap-start and swap-end fire in sequence during a single slot swap [obligation]', async () => {
    const { cr, slot_key } = makeCrossfadeWrapper()

    slot_key.value = 'b'
    await nextTick()
    await nextTick()
    await flushPromises()

    expect(cr.emitted('swap-start')).toBeTruthy()
    expect(cr.emitted('swap-end')).toBeTruthy()
  })

  // ── animateHeight prop [obligation] ────────────────────────────────────────

  test('animateHeight defaults to true — tweens height via gsap.timeline [obligation]', async () => {
    const { slot_key } = makeCrossfadeWrapper()

    slot_key.value = 'b'
    await nextTick()
    await nextTick()
    await flushPromises()

    expect(gsap.timeline).toHaveBeenCalled()
  })

  test('animateHeight=false snaps height via gsap.set instead of a timeline [obligation]', async () => {
    const { slot_key } = makeCrossfadeWrapper({ animateHeight: false })

    gsap.timeline.mockClear()
    gsap.set.mockClear()

    slot_key.value = 'b'
    await nextTick()
    await nextTick()
    await flushPromises()

    expect(gsap.timeline).not.toHaveBeenCalled()
    expect(gsap.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ height: expect.any(Number) })
    )
  })
})

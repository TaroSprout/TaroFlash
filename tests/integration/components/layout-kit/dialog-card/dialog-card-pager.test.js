import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import DialogCardPager from '@/components/layout-kit/dialog-card/dialog-card-pager.vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
// Mirrors the real session-pane animation hooks' call shape (el, done, onStart?)
// so dialog-card-pager's own onEnter/onLeave wiring is under direct test —
// the underlying tween math itself is covered in
// tests/unit/utils/animations/session-pane.test.js.

// onComplete resolves on a microtask, not synchronously — a real GSAP tween
// never completes within the same call stack as the leave hook, and calling
// done() synchronously during a real (unstubbed) unmount transition crashes
// Vue's internal removal bookkeeping (`afterLeave` reads a detached parentNode).
const { mockSessionPaneEnter, mockSessionPaneLeave } = vi.hoisted(() => ({
  mockSessionPaneEnter: vi.fn((_el, done, onStart) => {
    Promise.resolve().then(() => {
      onStart?.()
      done()
    })
  }),
  mockSessionPaneLeave: vi.fn((_el, done) => {
    Promise.resolve().then(() => done())
  })
}))

vi.mock('@/utils/animations/session-pane', () => ({
  sessionPaneLeave: mockSessionPaneLeave,
  sessionPaneEnter: mockSessionPaneEnter
}))

// ── Host component ────────────────────────────────────────────────────────────
// dialog-card-pager's default slot swaps between two keyed panes; a small host
// component lets tests flip which pane is active and observe the transition
// hooks fire against real (mocked) session-pane calls.

function makeHost(mode) {
  return defineComponent({
    components: { DialogCardPager },
    props: { phase: { type: String, default: 'a' } },
    emits: ['enter-start'],
    setup(props, { emit }) {
      return () =>
        h(DialogCardPager, { mode, onEnterStart: () => emit('enter-start') }, () =>
          props.phase === 'a'
            ? h('div', { key: 'a', 'data-testid': 'pane-a' }, 'A')
            : h('div', { key: 'b', 'data-testid': 'pane-b' }, 'B')
        )
    }
  })
}

function mountHost(mode) {
  // Vue Test Utils stubs the built-in <transition> by default (no JS hooks
  // fire); disable that stub so onLeave/onEnter run for real against the
  // mocked session-pane calls.
  return mount(makeHost(mode), {
    props: { phase: 'a' },
    global: { stubs: { transition: false } }
  })
}

beforeEach(() => {
  mockSessionPaneEnter.mockClear()
  mockSessionPaneLeave.mockClear()
})

describe('DialogCardPager', () => {
  test('renders the active slot pane', () => {
    const wrapper = mountHost()
    expect(wrapper.find('[data-testid="pane-a"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="pane-b"]').exists()).toBe(false)
  })

  test('switching the active pane calls sessionPaneLeave for the outgoing pane', async () => {
    const wrapper = mountHost()
    await wrapper.setProps({ phase: 'b' })
    await flushPromises()

    expect(mockSessionPaneLeave).toHaveBeenCalledOnce()
  })

  test('switching the active pane calls sessionPaneEnter for the incoming pane', async () => {
    const wrapper = mountHost()
    await wrapper.setProps({ phase: 'b' })
    await flushPromises()

    expect(mockSessionPaneEnter).toHaveBeenCalledOnce()
    expect(wrapper.find('[data-testid="pane-b"]').exists()).toBe(true)
  })

  // ── enter-start emit [obligation] ───────────────────────────────────────────

  test('[obligation] emits enter-start when the entering pane animation begins', async () => {
    const wrapper = mountHost()
    expect(wrapper.emitted('enter-start')).toBeFalsy()

    await wrapper.setProps({ phase: 'b' })
    await flushPromises()

    expect(wrapper.emitted('enter-start')).toHaveLength(1)
  })

  test('does not emit enter-start on initial mount (no pane is "entering" yet)', () => {
    const wrapper = mountHost()
    expect(wrapper.emitted('enter-start')).toBeFalsy()
  })

  // ── mode prop [obligation] ──────────────────────────────────────────────────

  describe('mode [obligation]', () => {
    test('mode="out-in" still fires both leave and enter hooks across a swap', async () => {
      const wrapper = mountHost('out-in')
      await wrapper.setProps({ phase: 'b' })
      await flushPromises()

      expect(mockSessionPaneLeave).toHaveBeenCalledOnce()
      expect(mockSessionPaneEnter).toHaveBeenCalledOnce()
    })

    test('mode="in-out" still fires both leave and enter hooks across a swap', async () => {
      const wrapper = mountHost('in-out')
      await wrapper.setProps({ phase: 'b' })
      await flushPromises()

      expect(mockSessionPaneLeave).toHaveBeenCalledOnce()
      expect(mockSessionPaneEnter).toHaveBeenCalledOnce()
    })

    test('an undefined mode (simultaneous enter/leave) still fires both hooks across a swap', async () => {
      const wrapper = mountHost(undefined)
      await wrapper.setProps({ phase: 'b' })
      await flushPromises()

      expect(mockSessionPaneLeave).toHaveBeenCalledOnce()
      expect(mockSessionPaneEnter).toHaveBeenCalledOnce()
    })
  })
})

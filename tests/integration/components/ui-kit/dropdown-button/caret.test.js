import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { provideDepth } from '@/composables/ui/depth'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitHoverSfx: vi.fn()
}))

// GSAP mock — synchronously calls onComplete so the <transition> JS hooks
// resolve immediately and the trigger span stays visible in the DOM.
vi.mock('gsap', () => ({
  gsap: {
    fromTo: vi.fn((_el, _from, to) => to?.onComplete?.()),
    to: vi.fn((_el, opts) => opts?.onComplete?.())
  }
}))

// @vue/test-utils auto-stubs <transition> by default, which never invokes
// @enter/@leave — spy on flip.ts directly so the delegation can be asserted,
// and resolve onComplete asynchronously (like the real GSAP animation) since
// calling it synchronously races Vue's own transition book-keeping and throws.
const { flipEnterMock, flipLeaveMock } = vi.hoisted(() => ({
  flipEnterMock: vi.fn((_el, _axis, onComplete) => setTimeout(() => onComplete?.(), 0)),
  flipLeaveMock: vi.fn((_el, _axis, onComplete) => setTimeout(() => onComplete?.(), 0))
}))
vi.mock('@/utils/animations/flip', () => ({
  flipEnter: flipEnterMock,
  flipLeave: flipLeaveMock
}))

import DropdownCaret from '@/components/ui-kit/dropdown-button/caret.vue'

function mountCaret(props = {}) {
  return mount(DropdownCaret, {
    props: { open: false, ...props },
    global: { directives: { sfx: {} } }
  })
}

function mountCaretRealTransition(props = {}) {
  return mount(DropdownCaret, {
    props: { open: false, ...props },
    global: { directives: { sfx: {} }, stubs: { transition: false } }
  })
}

// Wraps DropdownCaret in a parent that provides an ambient ui/depth, so tests
// can assert the identity caret stamps one step above whatever surface it's on.
function mountCaretAtAmbientDepth(ambient_depth, props = {}) {
  const Parent = defineComponent({
    setup() {
      provideDepth(ambient_depth)
      return () => h(DropdownCaret, { open: false, ...props })
    }
  })
  return mount(Parent, { global: { directives: { sfx: {} } } })
}

describe('DropdownCaret', () => {
  beforeEach(() => mockEmitSfx.mockClear())

  // ── neutral / depth ───────────────────────────────────────────────────────
  // An identity caret (neutral=false, the default) is one step above the
  // ambient depth; a neutral caret carries no data-depth (it's a companion of
  // its button, not a stepped surface).

  describe('neutral / depth', () => {
    test('data-depth is one step above the ambient depth by default (identity caret)', () => {
      const wrapper = mountCaret()
      expect(
        wrapper.find('[data-testid="dropdown-button__trigger"]').attributes('data-depth')
      ).toBe('1')
    })

    test('data-depth steps above an ancestor-provided ambient depth', () => {
      const wrapper = mountCaretAtAmbientDepth(1)
      expect(
        wrapper.find('[data-testid="dropdown-button__trigger"]').attributes('data-depth')
      ).toBe('2')
    })

    test('neutral=true omits data-depth entirely', () => {
      const wrapper = mountCaret({ neutral: true })
      expect(
        wrapper.find('[data-testid="dropdown-button__trigger"]').attributes('data-depth')
      ).toBeUndefined()
    })
  })

  // ── size → trigger padding ───────────────────────────────────────────────

  describe('size', () => {
    test('defaults to size=base with a 4px trigger padding', () => {
      const wrapper = mountCaret()
      const wrap = wrapper.find('[data-testid="dropdown-button__trigger-wrap"]')
      expect(wrap.classes()).toContain('ui-kit-btn-tokens--base')
      expect(wrap.attributes('style')).toContain('--btn-trigger-padding: 4px')
    })

    test('size=sm sets a 4px trigger padding', () => {
      const wrapper = mountCaret({ size: 'sm' })
      const wrap = wrapper.find('[data-testid="dropdown-button__trigger-wrap"]')
      expect(wrap.classes()).toContain('ui-kit-btn-tokens--sm')
      expect(wrap.attributes('style')).toContain('--btn-trigger-padding: 4px')
    })

    test('size=lg sets an 8px trigger padding', () => {
      const wrapper = mountCaret({ size: 'lg' })
      const wrap = wrapper.find('[data-testid="dropdown-button__trigger-wrap"]')
      expect(wrap.classes()).toContain('ui-kit-btn-tokens--lg')
      expect(wrap.attributes('style')).toContain('--btn-trigger-padding: 8px')
    })

    test('size=xl sets an 8px trigger padding', () => {
      const wrapper = mountCaret({ size: 'xl' })
      const wrap = wrapper.find('[data-testid="dropdown-button__trigger-wrap"]')
      expect(wrap.classes()).toContain('ui-kit-btn-tokens--xl')
      expect(wrap.attributes('style')).toContain('--btn-trigger-padding: 8px')
    })
  })

  // ── toggle emit ───────────────────────────────────────────────────────────

  describe('toggle emit', () => {
    test('clicking the trigger span emits toggle', async () => {
      const wrapper = mountCaret({ open: false })
      await wrapper.find('[data-testid="dropdown-button__trigger"]').trigger('click')
      expect(wrapper.emitted('toggle')).toHaveLength(1)
    })

    test('Enter keydown on the trigger span emits toggle', async () => {
      const wrapper = mountCaret({ open: false })
      await wrapper.find('[data-testid="dropdown-button__trigger"]').trigger('keydown.enter')
      expect(wrapper.emitted('toggle')).toHaveLength(1)
    })

    test('Space keydown on the trigger span emits toggle', async () => {
      const wrapper = mountCaret({ open: false })
      await wrapper.find('[data-testid="dropdown-button__trigger"]').trigger('keydown.space')
      expect(wrapper.emitted('toggle')).toHaveLength(1)
    })

    test('clicking the trigger span does not emit toggle when disabled [obligation]', async () => {
      const wrapper = mountCaret({ open: false, disabled: true })
      await wrapper.find('[data-testid="dropdown-button__trigger"]').trigger('click')
      expect(wrapper.emitted('toggle')).toBeUndefined()
    })

    // The click handler lives on the always-present wrapper div, not the
    // transitioning trigger span — a click landing mid-flip (or in the
    // out-in gap) hits the wrapper, which would otherwise swallow it.
    test('clicking the wrapper div (not the trigger span) emits toggle [obligation]', async () => {
      const wrapper = mountCaret({ open: false })
      await wrapper.find('[data-testid="dropdown-button__trigger-wrap"]').trigger('click')
      expect(wrapper.emitted('toggle')).toHaveLength(1)
    })

    test('clicking the wrapper div does not emit toggle when disabled [obligation]', async () => {
      const wrapper = mountCaret({ open: false, disabled: true })
      await wrapper.find('[data-testid="dropdown-button__trigger-wrap"]').trigger('click')
      expect(wrapper.emitted('toggle')).toBeUndefined()
    })

    test('Enter keydown on the trigger span does not emit toggle when disabled [obligation]', async () => {
      const wrapper = mountCaret({ open: false, disabled: true })
      await wrapper.find('[data-testid="dropdown-button__trigger"]').trigger('keydown.enter')
      expect(wrapper.emitted('toggle')).toBeUndefined()
    })

    test('Space keydown on the trigger span does not emit toggle when disabled [obligation]', async () => {
      const wrapper = mountCaret({ open: false, disabled: true })
      await wrapper.find('[data-testid="dropdown-button__trigger"]').trigger('keydown.space')
      expect(wrapper.emitted('toggle')).toBeUndefined()
    })
  })

  // ── open state ────────────────────────────────────────────────────────────

  describe('open state', () => {
    test('trigger span has data-active=true when open', () => {
      const wrapper = mountCaret({ open: true })
      expect(
        wrapper.find('[data-testid="dropdown-button__trigger"]').attributes('data-active')
      ).toBe('true')
    })

    test('trigger span has data-active=false when closed', () => {
      const wrapper = mountCaret({ open: false })
      expect(
        wrapper.find('[data-testid="dropdown-button__trigger"]').attributes('data-active')
      ).toBe('false')
    })

    test('toggling open updates data-active', async () => {
      const wrapper = mountCaret({ open: false })
      await wrapper.setProps({ open: true })
      expect(
        wrapper.find('[data-testid="dropdown-button__trigger"]').attributes('data-active')
      ).toBe('true')
      wrapper.unmount()
    })
  })

  // ── transition hooks [obligation] ────────────────────────────────────────
  // Toggling open swaps the trigger span's key, so the wrapping <transition>
  // runs a real leave (old span, onLeave → flipLeave) + enter (new span,
  // onEnter → flipEnter) — @vue/test-utils stubs <transition> by default, so
  // these are only exercised with `stubs: { transition: false }`.

  describe('transition hooks [obligation]', () => {
    test('toggling open delegates the leave to flipLeave on the x axis [obligation]', async () => {
      const wrapper = mountCaretRealTransition({ open: false })
      flipLeaveMock.mockClear()

      await wrapper.setProps({ open: true })
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(flipLeaveMock).toHaveBeenCalledWith(expect.anything(), 'x', expect.any(Function))
    })

    test('toggling open delegates the enter to flipEnter on the x axis [obligation]', async () => {
      const wrapper = mountCaretRealTransition({ open: false })
      flipEnterMock.mockClear()

      await wrapper.setProps({ open: true })
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(flipEnterMock).toHaveBeenCalledWith(expect.anything(), 'x', expect.any(Function))
    })
  })
})

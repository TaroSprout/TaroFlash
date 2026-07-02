import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

// Captures the query string useMatchMedia was called with, and drives its return
// value via matchState — lets tests flip mobile/desktop per query.
const { matchState, capturedQueries } = vi.hoisted(() => ({
  matchState: { value: false },
  capturedQueries: []
}))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: vi.fn((query) => {
    capturedQueries.push(query)
    return matchState
  })
}))

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: { iconLeft: String, iconOnly: Boolean, roundedFull: Boolean },
  emits: ['press'],
  setup(_p, { slots, attrs, emit }) {
    return () =>
      h(
        'button',
        {
          ...attrs,
          onClick: (e) => {
            attrs.onClick?.(e)
            emit('press')
          }
        },
        [slots.default?.()]
      )
  }
})

import DialogCard from '@/components/layout-kit/dialog-card/dialog-card.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountCard(props = {}, slots = {}) {
  return shallowMount(DialogCard, {
    props,
    slots,
    global: { stubs: { UiButton: UiButtonStub, DialogCardHeader: false } }
  })
}

beforeEach(() => {
  matchState.value = false
  capturedQueries.length = 0
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DialogCard', () => {
  // ── viewport_query drives its own provide per-instance [obligation] ────────

  describe('viewport_query [obligation]', () => {
    test('defaults to "w<sm | h<sm" when the prop is omitted', () => {
      mountCard()
      expect(capturedQueries).toContain('w<sm | h<sm')
    })

    test('forwards an explicit viewport_query verbatim, not the default', () => {
      mountCard({ viewport_query: 'w<sm' })
      expect(capturedQueries).toContain('w<sm')
      expect(capturedQueries).not.toContain('w<sm | h<sm')
    })

    test('two instances with different viewport_query props resolve independently', () => {
      const checkout = mountCard({ viewport_query: 'w<sm | h<sm' })
      const study_session = mountCard({ viewport_query: 'w<sm' })

      expect(capturedQueries).toEqual(expect.arrayContaining(['w<sm | h<sm', 'w<sm']))
      checkout.unmount()
      study_session.unmount()
    })

    test('exposed viewport is "mobile" when the resolved query matches', () => {
      matchState.value = true
      const wrapper = mountCard({ viewport_query: 'w<sm' })
      expect(wrapper.vm.viewport).toBe('mobile')
    })

    test('exposed viewport is "desktop" when the resolved query does not match', () => {
      matchState.value = false
      const wrapper = mountCard({ viewport_query: 'w<sm' })
      expect(wrapper.vm.viewport).toBe('desktop')
    })

    test('default slot receives the same viewport value that is exposed', () => {
      matchState.value = true
      const wrapper = mountCard(
        { viewport_query: 'w<sm' },
        { default: (props) => h('div', { 'data-testid': 'slot-viewport' }, props.viewport) }
      )
      expect(wrapper.find('[data-testid="slot-viewport"]').text()).toBe('mobile')
    })
  })

  // ── mobile classes defeat caller desktop sizing classes [obligation] ───────

  describe('mobile sizing wins over caller desktop classes [obligation]', () => {
    test('applies h-full! w-full! rounded-none! on mobile even with a caller class also present', () => {
      matchState.value = true
      const wrapper = mountCard({ class: 'w-150 h-160' })
      const classes = wrapper.find('[data-testid="dialog-card"]').classes()

      expect(classes).toContain('h-full!')
      expect(classes).toContain('w-full!')
      expect(classes).toContain('rounded-none!')
      expect(classes).toContain('w-150')
      expect(classes).toContain('h-160')
    })

    test('applies rounded-8 shadow-lg (not the mobile classes) on desktop', () => {
      matchState.value = false
      const wrapper = mountCard({ class: 'w-150 h-160' })
      const classes = wrapper.find('[data-testid="dialog-card"]').classes()

      expect(classes).toContain('rounded-8')
      expect(classes).toContain('shadow-lg')
      expect(classes).not.toContain('h-full!')
      expect(classes).not.toContain('w-full!')
      expect(classes).not.toContain('rounded-none!')
    })
  })

  // ── show_close_button ────────────────────────────────────────────────────────

  describe('show_close_button', () => {
    test('defaults to true — renders the fallback header close button when a title/no header slot is given', () => {
      const wrapper = mountCard({ title: 'My Title' })
      expect(wrapper.find('[data-testid="dialog-card__close"]').exists()).toBe(true)
    })

    test('renders the fallback header even without a title, as long as show_close_button is true', () => {
      const wrapper = mountCard()
      expect(wrapper.find('[data-testid="dialog-card__close"]').exists()).toBe(true)
    })

    test('suppresses the fallback close button when show_close_button is false', () => {
      const wrapper = mountCard({ show_close_button: false })
      expect(wrapper.find('[data-testid="dialog-card__close"]').exists()).toBe(false)
    })

    test('omits the fallback header entirely when there is no title and show_close_button is false', () => {
      const wrapper = mountCard({ show_close_button: false })
      expect(wrapper.findComponent({ name: 'DialogCardHeader' }).exists()).toBe(false)
    })

    test('clicking the close button emits close', async () => {
      const wrapper = mountCard({ title: 'x' })
      await wrapper.find('[data-testid="dialog-card__close"]').trigger('click')
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    test('close_label overrides the default i18n close label', () => {
      const wrapper = mountCard({ title: 'x', close_label: 'Dismiss' })
      expect(wrapper.find('[data-testid="dialog-card__close"]').text()).toBe('Dismiss')
    })
  })

  // ── header slot override ─────────────────────────────────────────────────────

  describe('#header slot', () => {
    test('a custom #header slot replaces the built-in fallback header entirely', () => {
      const wrapper = mountCard(
        { title: 'x' },
        { header: () => h('div', { 'data-testid': 'custom-header' }) }
      )
      expect(wrapper.find('[data-testid="custom-header"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="dialog-card__close"]').exists()).toBe(false)
    })
  })

  // ── header-end slot ───────────────────────────────────────────────────────────

  describe('#header-end slot', () => {
    test('renders header-end slot content when provided', () => {
      const wrapper = mountCard(
        { title: 'x' },
        { 'header-end': () => h('div', { 'data-testid': 'header-end-content' }) }
      )
      expect(wrapper.find('[data-testid="header-end-content"]').exists()).toBe(true)
    })

    test('leaves the header end area empty when no header-end slot is provided', () => {
      const wrapper = mountCard({ title: 'x' })
      expect(wrapper.find('[data-testid="dialog-card-header__end"]').text()).toBe('')
    })
  })

  // ── dialog_px prop ─────────────────────────────────────────────────────────────

  describe('dialog_px', () => {
    test('sets the --dialog-px CSS custom property when provided', () => {
      const wrapper = mountCard({ dialog_px: '3rem' })
      expect(wrapper.find('[data-testid="dialog-card"]').attributes('style')).toContain(
        '--dialog-px: 3rem'
      )
    })

    test('leaves --dialog-px unset (falls back to the Tailwind arbitrary value) when omitted', () => {
      const wrapper = mountCard()
      expect(wrapper.find('[data-testid="dialog-card"]').attributes('style')).toBeUndefined()
    })
  })
})

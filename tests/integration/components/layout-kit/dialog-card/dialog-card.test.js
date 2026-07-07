import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

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

import DialogCard from '@/components/layout-kit/dialog-card/index.vue'

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
  // ── full_bleed_at drives its own provide per-instance [obligation] ─────────

  describe('full_bleed_at [obligation]', () => {
    test('defaults to "w<sm | h<sm" when the prop is omitted', () => {
      mountCard()
      expect(capturedQueries).toContain('w<sm | h<sm')
    })

    test('forwards an explicit full_bleed_at verbatim, not the default', () => {
      mountCard({ full_bleed_at: 'w<sm' })
      expect(capturedQueries).toContain('w<sm')
      expect(capturedQueries).not.toContain('w<sm | h<sm')
    })

    test('two instances with different full_bleed_at props resolve independently', () => {
      const checkout = mountCard({ full_bleed_at: 'w<sm | h<sm' })
      const study_session = mountCard({ full_bleed_at: 'w<sm' })

      expect(capturedQueries).toEqual(expect.arrayContaining(['w<sm | h<sm', 'w<sm']))
      checkout.unmount()
      study_session.unmount()
    })

    test('exposed viewport is "mobile" when the resolved query matches', () => {
      matchState.value = true
      const wrapper = mountCard({ full_bleed_at: 'w<sm' })
      expect(wrapper.vm.viewport).toBe('mobile')
    })

    test('exposed viewport is "desktop" when the resolved query does not match', () => {
      matchState.value = false
      const wrapper = mountCard({ full_bleed_at: 'w<sm' })
      expect(wrapper.vm.viewport).toBe('desktop')
    })

    test('default slot receives the same viewport value that is exposed', () => {
      matchState.value = true
      const wrapper = mountCard(
        { full_bleed_at: 'w<sm' },
        { default: (props) => h('div', { 'data-testid': 'slot-viewport' }, props.viewport) }
      )
      expect(wrapper.find('[data-testid="slot-viewport"]').text()).toBe('mobile')
    })
  })

  // ── size prop bundles width/height + full_bleed_at + content_max_width [obligation]

  describe('size [obligation]', () => {
    test('defaults to "md" — applies w-150 h-160 and a 32.5rem content max width', () => {
      const wrapper = mountCard()
      const classes = wrapper.find('[data-testid="dialog-card"]').classes()

      expect(classes).toContain('w-150')
      expect(classes).toContain('h-160')
      expect(wrapper.find('[data-testid="dialog-card__body"]').attributes('style')).toContain(
        '--content-grid-max-width: 32.5rem'
      )
    })

    test('size="sm" applies w-140 h-110, full_bleed_at "w<sm | h<sm", and a 25rem content max width', () => {
      const wrapper = mountCard({ size: 'sm' })
      const classes = wrapper.find('[data-testid="dialog-card"]').classes()

      expect(classes).toContain('w-140')
      expect(classes).toContain('h-110')
      expect(capturedQueries).toContain('w<sm | h<sm')
      expect(wrapper.find('[data-testid="dialog-card__body"]').attributes('style')).toContain(
        '--content-grid-max-width: 25rem'
      )
    })

    test('size="lg" applies w-full max-w-160 h-170, full_bleed_at "w<sm", and a 35rem content max width', () => {
      const wrapper = mountCard({ size: 'lg' })
      const classes = wrapper.find('[data-testid="dialog-card"]').classes()

      expect(classes).toContain('w-full')
      expect(classes).toContain('max-w-160')
      expect(classes).toContain('h-170')
      expect(capturedQueries).toContain('w<sm')
      expect(capturedQueries).not.toContain('w<sm | h<sm')
      expect(wrapper.find('[data-testid="dialog-card__body"]').attributes('style')).toContain(
        '--content-grid-max-width: 35rem'
      )
    })

    test('an explicit full_bleed_at wins over the size default', () => {
      mountCard({ size: 'sm', full_bleed_at: 'w<sm' })
      expect(capturedQueries).toContain('w<sm')
      expect(capturedQueries).not.toContain('w<sm | h<sm')
    })

    test('an explicit content_max_width wins over the size default', () => {
      const wrapper = mountCard({ size: 'sm', content_max_width: '50rem' })
      expect(wrapper.find('[data-testid="dialog-card__body"]').attributes('style')).toContain(
        '--content-grid-max-width: 50rem'
      )
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

  // ── desktop-only frame chrome [obligation] ──────────────────────────────────

  describe('desktop frame chrome [obligation]', () => {
    test('applies the border-t/border-l frame classes on desktop', () => {
      matchState.value = false
      const wrapper = mountCard()
      const classes = wrapper.find('[data-testid="dialog-card"]').classes()

      expect(classes).toContain('border-t')
      expect(classes).toContain('border-l')
      expect(classes).toContain('border-brown-100')
    })

    test('drops the frame classes entirely on mobile (full-bleed, no edge to frame)', () => {
      matchState.value = true
      const wrapper = mountCard()
      const classes = wrapper.find('[data-testid="dialog-card"]').classes()

      expect(classes).not.toContain('border-t')
      expect(classes).not.toContain('border-l')
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

    test('themes the close button with brown-100 / stone-700', () => {
      const wrapper = mountCard({ title: 'x' })
      const close = wrapper.find('[data-testid="dialog-card__close"]')
      expect(close.attributes('data-theme')).toBe('brown-100')
      expect(close.attributes('data-theme-dark')).toBe('stone-700')
    })
  })

  // ── show_header [obligation] ────────────────────────────────────────────────

  describe('show_header [obligation]', () => {
    test('hides the whole header (including the close button) when false', () => {
      const wrapper = mountCard({ title: 'x', show_header: false })
      expect(wrapper.findComponent({ name: 'DialogCardHeader' }).exists()).toBe(false)
      expect(wrapper.find('[data-testid="dialog-card__close"]').exists()).toBe(false)
    })

    test('renders the header by default (show_header omitted)', () => {
      const wrapper = mountCard({ title: 'x' })
      expect(wrapper.findComponent({ name: 'DialogCardHeader' }).exists()).toBe(true)
    })
  })

  // ── close_disabled [obligation] ─────────────────────────────────────────────

  describe('close_disabled [obligation]', () => {
    test('disables the built-in close button when true', () => {
      const wrapper = mountCard({ title: 'x', close_disabled: true })
      expect(wrapper.find('[data-testid="dialog-card__close"]').attributes('disabled')).toBe('')
    })

    test('leaves the close button enabled by default', () => {
      const wrapper = mountCard({ title: 'x' })
      expect(wrapper.find('[data-testid="dialog-card__close"]').attributes('disabled')).toBe(
        undefined
      )
    })
  })

  // ── header-start slot [obligation] ──────────────────────────────────────────

  describe('#header-start slot [obligation]', () => {
    test('falls back to the built-in close button when not overridden', () => {
      const wrapper = mountCard({ title: 'x' })
      expect(wrapper.find('[data-testid="dialog-card__close"]').exists()).toBe(true)
    })

    test('a custom #header-start slot replaces the built-in close button', () => {
      const wrapper = mountCard(
        { title: 'x' },
        { 'header-start': () => h('div', { 'data-testid': 'custom-header-start' }) }
      )
      expect(wrapper.find('[data-testid="custom-header-start"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="dialog-card__close"]').exists()).toBe(false)
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

  // ── float_header [obligation] ───────────────────────────────────────────────

  describe('float_header [obligation]', () => {
    test('takes the header out of flow (absolute inset-x-0 top-0 z-10) when true [obligation]', () => {
      const wrapper = mountCard({ title: 'x', float_header: true })
      const classes = wrapper.find('[data-testid="dialog-card__header-wrap"]').classes()

      expect(classes).toContain('absolute')
      expect(classes).toContain('inset-x-0')
      expect(classes).toContain('top-0')
      expect(classes).toContain('z-10')
    })

    test('leaves the header in normal flex flow by default (no absolute classes) [obligation]', () => {
      const wrapper = mountCard({ title: 'x' })
      const classes = wrapper.find('[data-testid="dialog-card__header-wrap"]').classes()

      expect(classes).not.toContain('absolute')
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

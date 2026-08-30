import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, shallowMount } from '@vue/test-utils'
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
  props: {
    iconLeft: String,
    iconOnly: Boolean,
    roundedFull: Boolean,
    sfx: Object,
    neutral: Boolean
  },
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

// Wraps DialogCard in a parent that itself carries a data-station, so tests
// can assert the card's own station stays constant regardless of the
// surface it opened over.
function mountCardInsideStation(ambient_station, props = {}) {
  const Parent = defineComponent({
    setup() {
      return () => h('div', { 'data-station': ambient_station }, h(DialogCard, props))
    }
  })
  // `mount`, not `shallowMount` — DialogCard is Parent's direct child, and
  // shallowMount auto-stubs direct children, which would stub out the very
  // component under test.
  return mount(Parent, {
    global: { stubs: { UiButton: UiButtonStub, DialogCardHeader: false } }
  })
}

beforeEach(() => {
  matchState.value = false
  capturedQueries.length = 0
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DialogCard', () => {
  // ── full_bleed_at drives its own provide per-instance ─────────

  describe('full_bleed_at', () => {
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

  // ── station ──────────────────────────────────────────────────
  // A dialog card stamps a constant station — it never varies with whatever
  // surface it happens to be mounted inside.

  describe('station', () => {
    test('stamps the constant data-station="window" with no ambient surface', () => {
      const wrapper = mountCard()
      expect(wrapper.find('[data-testid="dialog-card"]').attributes('data-station')).toBe('window')
    })

    test('data-station="window" does not vary with a surrounding station', () => {
      const wrapper = mountCardInsideStation('panel')
      expect(wrapper.find('[data-testid="dialog-card"]').attributes('data-station')).toBe('window')
    })
  })

  // ── size prop bundles width/height + full_bleed_at + content_max_width

  describe('size', () => {
    test('defaults to "md" — applies w-150 h-160 and a 32.5rem content max width', () => {
      const wrapper = mountCard()
      const classes = wrapper.find('[data-testid="dialog-card"]').classes()

      expect(classes).toContain('w-150')
      expect(classes).toContain('h-160')
      expect(wrapper.find('[data-testid="dialog-card"]').attributes('style')).toContain(
        '--content-grid-max-width: 32.5rem'
      )
    })

    test('size="sm" applies w-140 h-110, full_bleed_at "w<sm | h<sm", and a 25rem content max width', () => {
      const wrapper = mountCard({ size: 'sm' })
      const classes = wrapper.find('[data-testid="dialog-card"]').classes()

      expect(classes).toContain('w-140')
      expect(classes).toContain('h-110')
      expect(capturedQueries).toContain('w<sm | h<sm')
      expect(wrapper.find('[data-testid="dialog-card"]').attributes('style')).toContain(
        '--content-grid-max-width: 25rem'
      )
    })

    test('size="lg" applies w-160 h-170, full_bleed_at "w<sm | h<md", and a 37rem content max width', () => {
      const wrapper = mountCard({ size: 'lg' })
      const classes = wrapper.find('[data-testid="dialog-card"]').classes()

      expect(classes).toContain('w-160')
      expect(classes).toContain('h-170')
      expect(capturedQueries).toContain('w<sm | h<md')
      expect(capturedQueries).not.toContain('w<sm | h<sm')
      expect(wrapper.find('[data-testid="dialog-card"]').attributes('style')).toContain(
        '--content-grid-max-width: 37rem'
      )
    })

    test('an explicit full_bleed_at wins over the size default', () => {
      mountCard({ size: 'sm', full_bleed_at: 'w<sm' })
      expect(capturedQueries).toContain('w<sm')
      expect(capturedQueries).not.toContain('w<sm | h<sm')
    })

    test('an explicit content_max_width wins over the size default', () => {
      const wrapper = mountCard({ size: 'sm', content_max_width: '50rem' })
      expect(wrapper.find('[data-testid="dialog-card"]').attributes('style')).toContain(
        '--content-grid-max-width: 50rem'
      )
    })
  })

  // ── content_breakout_max_width per size ────────────────────────

  describe('content_breakout_max_width', () => {
    test('size="sm" defaults --content-grid-breakout-max-width to 35rem', () => {
      const wrapper = mountCard({ size: 'sm' })
      expect(wrapper.find('[data-testid="dialog-card"]').attributes('style')).toContain(
        '--content-grid-breakout-max-width: 35rem'
      )
    })

    test('size="md" (default) sets --content-grid-breakout-max-width to 37.5rem', () => {
      const wrapper = mountCard()
      expect(wrapper.find('[data-testid="dialog-card"]').attributes('style')).toContain(
        '--content-grid-breakout-max-width: 37.5rem'
      )
    })

    test('size="lg" sets --content-grid-breakout-max-width to 40rem', () => {
      const wrapper = mountCard({ size: 'lg' })
      expect(wrapper.find('[data-testid="dialog-card"]').attributes('style')).toContain(
        '--content-grid-breakout-max-width: 40rem'
      )
    })

    test('an explicit content_breakout_max_width wins over the size default', () => {
      const wrapper = mountCard({ size: 'sm', content_breakout_max_width: '60rem' })
      expect(wrapper.find('[data-testid="dialog-card"]').attributes('style')).toContain(
        '--content-grid-breakout-max-width: 60rem'
      )
    })
  })

  // ── mobile classes defeat caller desktop sizing classes ───────

  describe('mobile sizing wins over caller desktop classes', () => {
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

    test('applies rounded-8 (not the mobile classes) on desktop', () => {
      matchState.value = false
      const wrapper = mountCard({ class: 'w-150 h-160' })
      const classes = wrapper.find('[data-testid="dialog-card"]').classes()

      expect(classes).toContain('rounded-8')
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

    test('renders the close button as neutral', () => {
      const wrapper = mountCard({ title: 'x' })
      const close = wrapper.findComponent(UiButtonStub)
      expect(close.props('neutral')).toBe(true)
    })

    test('forwards sfx.close to the close button press channel', () => {
      const wrapper = mountCard({ title: 'x', sfx: { close: 'ui.press' } })
      const close = wrapper.findComponent(UiButtonStub)
      expect(close.props('sfx')).toEqual({ press: 'ui.press' })
    })

    test('defaults the close button press channel to dialog.close when sfx.close is omitted', () => {
      const wrapper = mountCard({ title: 'x' })
      const close = wrapper.findComponent(UiButtonStub)
      expect(close.props('sfx')).toEqual({ press: 'dialog.close' })
    })
  })

  // ── show_header ────────────────────────────────────────────────

  describe('show_header', () => {
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

  // ── close_disabled ─────────────────────────────────────────────

  describe('close_disabled', () => {
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

  // ── header-start slot ──────────────────────────────────────────

  describe('#header-start slot', () => {
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

  // ── header-after slot ────────────────────────────────────────

  describe('#header-after slot', () => {
    test('renders header-after slot content when provided', () => {
      const wrapper = mountCard(
        { title: 'x' },
        { 'header-after': () => h('div', { 'data-testid': 'header-after-content' }) }
      )
      expect(wrapper.find('[data-testid="header-after-content"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="dialog-card-header__after"]').exists()).toBe(true)
    })

    test('omits the after strip entirely when no header-after slot is provided', () => {
      const wrapper = mountCard({ title: 'x' })
      expect(wrapper.find('[data-testid="dialog-card-header__after"]').exists()).toBe(false)
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

  // ── float_header ───────────────────────────────────────────────

  describe('float_header', () => {
    test('takes the header out of flow (absolute inset-x-0 top-0 z-10) when true', () => {
      const wrapper = mountCard({ title: 'x', float_header: true })
      const classes = wrapper.find('[data-testid="dialog-card-header"]').classes()

      expect(classes).toContain('absolute')
      expect(classes).toContain('inset-x-0')
      expect(classes).toContain('top-0')
      expect(classes).toContain('z-10')
    })

    test('leaves the header in normal flow by default (no absolute classes)', () => {
      const wrapper = mountCard({ title: 'x' })
      const classes = wrapper.find('[data-testid="dialog-card-header"]').classes()

      expect(classes).not.toContain('absolute')
    })
  })

  // ── bg_class prop ────────────────────────────────────────────────────────────

  describe('bg_class', () => {
    test('defaults to bg-surface when omitted', () => {
      const wrapper = mountCard()
      const classes = wrapper.find('[data-testid="dialog-card"]').classes()

      expect(classes).toContain('bg-surface')
    })

    test('a caller value replaces the default outright', () => {
      const wrapper = mountCard({ bg_class: 'bg-brown-100 dark:bg-grey-800' })
      const classes = wrapper.find('[data-testid="dialog-card"]').classes()

      expect(classes).toContain('bg-brown-100')
      expect(classes).not.toContain('bg-brown-200')
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
      // `--content-grid-padding: var(--dialog-px)` always contains the
      // substring "--dialog-px" as a var() reference — assert there's no
      // actual `--dialog-px:` declaration instead of a bare substring match.
      expect(wrapper.find('[data-testid="dialog-card"]').attributes('style')).not.toContain(
        '--dialog-px:'
      )
    })
  })

  // ── --content-grid-padding regression ──────────────────────────
  // The `content-grid-px-(--dialog-px)` Tailwind utility never generated a CSS
  // rule for a bare custom-property reference, so padding silently stayed 0.
  // The fix sets --content-grid-padding directly via inline style instead.

  describe('--content-grid-padding', () => {
    test('sets --content-grid-padding to var(--dialog-px) via inline style', () => {
      const wrapper = mountCard()
      expect(wrapper.find('[data-testid="dialog-card"]').attributes('style')).toContain(
        '--content-grid-padding: var(--dialog-px)'
      )
    })

    test('still sets --content-grid-padding when a custom dialog_px is provided', () => {
      const wrapper = mountCard({ dialog_px: '3rem' })
      expect(wrapper.find('[data-testid="dialog-card"]').attributes('style')).toContain(
        '--content-grid-padding: var(--dialog-px)'
      )
    })
  })

  // ── --content-grid-max-width holds on mobile ───────────────────
  // The content column keeps its configured max width on mobile instead of
  // collapsing to 100% — the content-grid CSS's own
  // `min(100% - padding*2, max-width)` clamp already keeps narrow viewports
  // from being over-constrained, so the component just hands down a fixed
  // width unconditionally.

  describe('--content-grid-max-width holds on mobile', () => {
    test('resolves to the size default on mobile, not 100%', () => {
      matchState.value = true
      const wrapper = mountCard({ size: 'lg' })
      const style = wrapper.find('[data-testid="dialog-card"]').attributes('style')

      expect(style).toContain('--content-grid-max-width: 37rem')
      expect(style).not.toContain('--content-grid-max-width: 100%')
    })

    test('an explicit content_max_width still wins on mobile', () => {
      matchState.value = true
      const wrapper = mountCard({ content_max_width: '50rem' })
      const style = wrapper.find('[data-testid="dialog-card"]').attributes('style')

      expect(style).toContain('--content-grid-max-width: 50rem')
      expect(style).not.toContain('--content-grid-max-width: 100%')
    })

    test('resolves to the same size default on desktop as on mobile', () => {
      matchState.value = false
      const wrapper = mountCard({ size: 'lg' })
      expect(wrapper.find('[data-testid="dialog-card"]').attributes('style')).toContain(
        '--content-grid-max-width: 37rem'
      )
    })

    test('an explicit content_max_width still wins on desktop', () => {
      matchState.value = false
      const wrapper = mountCard({ content_max_width: '50rem' })
      expect(wrapper.find('[data-testid="dialog-card"]').attributes('style')).toContain(
        '--content-grid-max-width: 50rem'
      )
    })

    test.each([
      ['sm', '25rem'],
      ['md', '32.5rem'],
      ['lg', '37rem']
    ])(
      'size="%s" hands down the fixed width %s, not a percentage, on mobile',
      (size, expected_width) => {
        matchState.value = true
        const wrapper = mountCard({ size })
        const style = wrapper.find('[data-testid="dialog-card"]').attributes('style')

        expect(style).toContain(`--content-grid-max-width: ${expected_width}`)
        expect(style).not.toMatch(/--content-grid-max-width:\s*\d+%/)
      }
    )
  })

  // ── --content-grid-breakout-max-width is unaffected by viewport

  describe('--content-grid-breakout-max-width unaffected by viewport', () => {
    test('resolves to the same value on mobile and desktop for a given size', () => {
      matchState.value = true
      const mobile = mountCard({ size: 'lg' })
      const mobile_style = mobile.find('[data-testid="dialog-card"]').attributes('style')

      matchState.value = false
      const desktop = mountCard({ size: 'lg' })
      const desktop_style = desktop.find('[data-testid="dialog-card"]').attributes('style')

      expect(mobile_style).toContain('--content-grid-breakout-max-width: 40rem')
      expect(desktop_style).toContain('--content-grid-breakout-max-width: 40rem')
    })
  })

  // ── mobile-variant trigger unchanged ───────────────────────────
  // The fix only dropped the mobile branch on --content-grid-max-width — the
  // viewport computation itself, and everything else that keys off it (the
  // exposed `viewport`, the mobile sizing classes), still work the same way.

  describe('mobile-variant trigger unchanged', () => {
    test('viewport is still driven by the resolved matchMedia query', () => {
      matchState.value = true
      const wrapper = mountCard({ full_bleed_at: 'w<sm' })
      expect(wrapper.vm.viewport).toBe('mobile')
    })

    test('mobile sizing classes (h-full!/w-full!/rounded-none!) still key off the same viewport', () => {
      matchState.value = true
      const wrapper = mountCard()
      const classes = wrapper.find('[data-testid="dialog-card"]').classes()

      expect(classes).toContain('h-full!')
      expect(classes).toContain('w-full!')
      expect(classes).toContain('rounded-none!')
    })
  })

  // ── #toolbar slot reacts to being toggled ──────────────────────
  // `slots.toolbar` is read from plain functions called in the template, not a
  // computed — useSlots() isn't reactive, so a computed would cache the first
  // answer and never see a conditionally-rendered #toolbar slot appear.

  describe('#toolbar slot reactivity', () => {
    test('grid-rows class and --dialog-body-pb flip when a v-if toolbar slot toggles on', async () => {
      const Parent = defineComponent({
        setup() {
          const show_toolbar = ref(false)
          return { show_toolbar }
        },
        render() {
          return h(
            DialogCard,
            { size: 'md' },
            this.show_toolbar ? { toolbar: () => h('div', 'toolbar') } : {}
          )
        }
      })

      const wrapper = mount(Parent, {
        global: { stubs: { UiButton: UiButtonStub, DialogCardHeader: false } }
      })
      const card = wrapper.find('[data-testid="dialog-card"]')

      expect(card.classes()).toContain('grid-rows-[auto_minmax(0,1fr)]')
      expect(card.attributes('style')).toContain('--dialog-body-pb: var(--dialog-px)')
      expect(wrapper.find('[data-testid="dialog-card__toolbar"]').exists()).toBe(false)

      wrapper.vm.show_toolbar = true
      await wrapper.vm.$nextTick()

      const card_after = wrapper.find('[data-testid="dialog-card"]')
      expect(card_after.classes()).toContain('grid-rows-[auto_minmax(0,1fr)_auto]')
      expect(card_after.attributes('style')).toContain('--dialog-body-pb: 0px')
      expect(wrapper.find('[data-testid="dialog-card__toolbar"]').exists()).toBe(true)
    })
  })
})

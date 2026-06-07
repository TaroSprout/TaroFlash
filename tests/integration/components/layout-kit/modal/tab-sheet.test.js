import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/composables/use-media-query', () => ({
  useMatchMedia: (query) => ({
    get value() {
      // has_sidebar — 'w>=lg & fine'; visible exactly when not in tablet mode.
      if (query.includes('&')) return !(globalThis.__isTablet ?? false)
      return false
    }
  })
}))

function setBelowLg(v) {
  globalThis.__isTablet = v
}

import TabSheet from '@/components/layout-kit/modal/tab-sheet.vue'

const tabs = [
  { value: 'one', label: 'One', icon: 'card-deck' },
  { value: 'two', label: 'Two' },
  { value: 'three', label: 'Three' }
]

// Stub mobile-sheet that renders every slot tab-sheet hands it so we can
// assert against the forwarded slot content while keeping tab-sheet's
// own template under test.
const MobileSheetStub = defineComponent({
  name: 'MobileSheet',
  inheritAttrs: false,
  props: {
    show_close_button: { type: Boolean, default: undefined },
    title: { type: String, default: undefined },
    cover_config: { type: Object, default: undefined },
    surface: { type: String, default: undefined },
    header_border: { type: String, default: undefined }
  },
  setup(props, { slots }) {
    return () =>
      h(
        'div',
        {
          'data-testid': 'mobile-sheet-stub',
          'data-show-close-button': String(props.show_close_button),
          'data-surface': props.surface,
          'data-header-border': props.header_border
        },
        [
          slots.overlay?.(),
          slots['header-content']?.(),
          slots.sidebar?.(),
          slots.default?.(),
          slots.footer?.()
        ]
      )
  }
})

function mountSheet(props = {}, slots = {}) {
  return shallowMount(TabSheet, {
    props: { tabs, ...props },
    slots,
    global: { stubs: { MobileSheet: MobileSheetStub } }
  })
}

describe('TabSheet', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setBelowLg(false)
  })

  // ── Sidebar rendering ──────────────────────────────────────────────────────

  test('renders one button per tab', () => {
    const wrapper = mountSheet()
    expect(wrapper.findAll('[data-testid="tab-sheet__tab"]')).toHaveLength(tabs.length)
  })

  test('highlights the first tab as active by default', () => {
    const wrapper = mountSheet()
    const buttons = wrapper.findAll('[data-testid="tab-sheet__tab"]')
    expect(buttons[0].attributes('data-active')).toBe('true')
    expect(buttons[1].attributes('data-active')).toBe('false')
  })

  test('renders the close button in the sidebar', () => {
    const wrapper = mountSheet()
    expect(wrapper.find('[data-testid="tab-sheet__close-button"]').exists()).toBe(true)
  })

  test('omits the sidebar entirely when no tabs are provided', () => {
    const wrapper = shallowMount(TabSheet, {
      props: { tabs: [] },
      global: { stubs: { MobileSheet: MobileSheetStub } }
    })
    expect(wrapper.find('[data-testid="tab-sheet__sidebar"]').exists()).toBe(false)
  })

  // ── Tablist a11y ───────────────────────────────────────────────────────────

  test('marks the active tab with aria-selected=true and inactive with false', () => {
    const wrapper = mountSheet({ active: 'two' })
    const buttons = wrapper.findAll('[data-testid="tab-sheet__tab"]')
    expect(buttons[1].attributes('aria-selected')).toBe('true')
    expect(buttons[0].attributes('aria-selected')).toBe('false')
  })

  test('exposes role="tablist" on the tab list and role="tab" on each tab', () => {
    const wrapper = mountSheet()
    expect(wrapper.find('[data-testid="tab-sheet__tabs"]').attributes('role')).toBe('tablist')
    const buttons = wrapper.findAll('[data-testid="tab-sheet__tab"]')
    for (const button of buttons) expect(button.attributes('role')).toBe('tab')
  })

  test('exposes role="tabpanel" on the content container', () => {
    const wrapper = mountSheet()
    expect(wrapper.find('[data-testid="tab-sheet__content"]').attributes('role')).toBe('tabpanel')
  })

  // ── Tab switching + v-model ────────────────────────────────────────────────

  test('clicking a different tab emits update:active with that tab value', async () => {
    const wrapper = mountSheet()
    const buttons = wrapper.findAll('[data-testid="tab-sheet__tab"]')
    await buttons[1].trigger('click')

    const events = wrapper.emitted('update:active')
    expect(events).toBeTruthy()
    expect(events[events.length - 1]).toEqual(['two'])
  })

  test('clicking a different tab emits select with that tab value', async () => {
    const wrapper = mountSheet()
    const buttons = wrapper.findAll('[data-testid="tab-sheet__tab"]')
    await buttons[1].trigger('click')
    expect(wrapper.emitted('select')).toEqual([['two']])
  })

  test('clicking the already-active tab emits reselect, not update:active', async () => {
    const wrapper = mountSheet({ active: 'two' })
    const buttons = wrapper.findAll('[data-testid="tab-sheet__tab"]')
    await buttons[1].trigger('click')

    expect(wrapper.emitted('reselect')).toEqual([['two']])
    const events = wrapper.emitted('update:active') ?? []
    const fromClick = events.filter(([value]) => value === 'two')
    expect(fromClick.length).toBeLessThanOrEqual(1)
  })

  test('respects the active prop / v-model on initial render', () => {
    const wrapper = mountSheet({ active: 'three' })
    const buttons = wrapper.findAll('[data-testid="tab-sheet__tab"]')
    expect(buttons[2].attributes('data-active')).toBe('true')
    expect(buttons[0].attributes('data-active')).toBe('false')
  })

  // ── Slot forwarding ────────────────────────────────────────────────────────

  test('renders default slot inside the content area', () => {
    const wrapper = mountSheet({}, { default: '<p data-testid="content">body</p>' })
    expect(wrapper.find('[data-testid="content"]').exists()).toBe(true)
  })

  test('forwards overlay slot through to the underlying mobile-sheet', () => {
    const wrapper = mountSheet({}, { overlay: '<div data-testid="overlay-content">over</div>' })
    expect(wrapper.find('[data-testid="overlay-content"]').exists()).toBe(true)
  })

  test('forwards header-content slot through to the underlying mobile-sheet', () => {
    const wrapper = mountSheet(
      { title: 'My Sheet' },
      { 'header-content': '<h2 data-testid="header-custom">Custom</h2>' }
    )
    expect(wrapper.find('[data-testid="header-custom"]').exists()).toBe(true)
  })

  test('forwards footer slot through to the underlying mobile-sheet', () => {
    const wrapper = mountSheet({}, { footer: '<div data-testid="footer-content">f</div>' })
    expect(wrapper.find('[data-testid="footer-content"]').exists()).toBe(true)
  })

  // ── parts prop ─────────────────────────────────────────────────────────────

  test('merges parts.content classes onto the content container', () => {
    const wrapper = mountSheet({ parts: { content: 'extra-content-class' } })
    const classes = wrapper.find('[data-testid="tab-sheet__content"]').classes()
    expect(classes).toContain('extra-content-class')
  })

  test('merges parts.sidebar classes onto the sidebar container', () => {
    const wrapper = mountSheet({ parts: { sidebar: 'extra-sidebar-class' } })
    const classes = wrapper.find('[data-testid="tab-sheet__sidebar"]').classes()
    expect(classes).toContain('extra-sidebar-class')
  })

  test('merges parts.tab classes onto each tab button', () => {
    const wrapper = mountSheet({ parts: { tab: 'extra-tab-class' } })
    const buttons = wrapper.findAll('[data-testid="tab-sheet__tab"]')
    for (const button of buttons) {
      expect(button.classes()).toContain('extra-tab-class')
    }
  })

  // ── close event ────────────────────────────────────────────────────────────

  test('clicking the close button emits close', async () => {
    const wrapper = mountSheet()
    const closeBtn = wrapper.find('[data-testid="tab-sheet__close-button"]')
    await closeBtn.trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  test('re-emits close when the underlying mobile-sheet emits close', async () => {
    const wrapper = mountSheet()
    const sheet = wrapper.findComponent({ name: 'MobileSheet' })
    sheet.vm.$emit('close')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  // ── mobile-sheet close-button fallback (below lg) ─────────────────────────

  test('does not surface the mobile-sheet close button on desktop when tabs are present', () => {
    setBelowLg(false)
    const wrapper = mountSheet()
    const sheet = wrapper.find('[data-testid="mobile-sheet-stub"]')
    expect(sheet.attributes('data-show-close-button')).toBe('false')
  })

  test('surfaces the mobile-sheet close button when collapsed below lg (sidebar hidden)', () => {
    setBelowLg(true)
    const wrapper = mountSheet()
    const sheet = wrapper.find('[data-testid="mobile-sheet-stub"]')
    expect(sheet.attributes('data-show-close-button')).toBe('true')
  })

  test('surfaces the mobile-sheet close button when no tabs are passed regardless of breakpoint', () => {
    setBelowLg(false)
    const wrapper = shallowMount(TabSheet, {
      props: {},
      global: { stubs: { MobileSheet: MobileSheetStub } }
    })
    const sheet = wrapper.find('[data-testid="mobile-sheet-stub"]')
    expect(sheet.attributes('data-show-close-button')).toBe('true')
  })

  test('honors an explicit show_close_button=false even when below lg', () => {
    setBelowLg(true)
    const wrapper = shallowMount(TabSheet, {
      props: { tabs, show_close_button: false },
      global: { stubs: { MobileSheet: MobileSheetStub } }
    })
    const sheet = wrapper.find('[data-testid="mobile-sheet-stub"]')
    expect(sheet.attributes('data-show-close-button')).toBe('false')
  })

  // ── surface prop ───────────────────────────────────────────────────────────

  test('defaults the sidebar surface to "standard"', () => {
    const wrapper = mountSheet()
    expect(wrapper.find('[data-testid="tab-sheet__sidebar"]').attributes('data-surface')).toBe(
      'standard'
    )
  })

  test('reflects surface="inverted" on the sidebar data-surface attribute', () => {
    const wrapper = mountSheet({ surface: 'inverted' })
    expect(wrapper.find('[data-testid="tab-sheet__sidebar"]').attributes('data-surface')).toBe(
      'inverted'
    )
  })

  test('forwards surface prop to the underlying mobile-sheet', () => {
    const wrapper = mountSheet({ surface: 'inverted' })
    const sheet = wrapper.find('[data-testid="mobile-sheet-stub"]')
    expect(sheet.attributes('data-surface')).toBe('inverted')
  })

  // ── header_border prop ────────────────────────────────────────────────────

  test('forwards header_border prop to the underlying mobile-sheet', () => {
    const wrapper = mountSheet({ header_border: 'cloud' })
    const sheet = wrapper.find('[data-testid="mobile-sheet-stub"]')
    expect(sheet.attributes('data-header-border')).toBe('cloud')
  })

  test('defaults header_border to "wave" when forwarded', () => {
    const wrapper = mountSheet()
    const sheet = wrapper.find('[data-testid="mobile-sheet-stub"]')
    expect(sheet.attributes('data-header-border')).toBe('wave')
  })
})

import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import MobileSheet from '@/components/layout-kit/modal/mobile-sheet.vue'

// Default stub: emits press on click so @press="emit('close')" fires through the
// auto-stub layer without needing real button internals.
const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: { iconLeft: String, iconOnly: Boolean, inverted: Boolean, playOnTap: Boolean },
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

// Render-function stub (no runtime compiler in tests) that exposes the close
// button's default slot so its label text can be asserted.
const UiButtonSlotStub = defineComponent({
  name: 'UiButton',
  setup(_props, { slots }) {
    return () => h('button', slots.default?.())
  }
})

function mountSheet(props = {}, slots = {}, attrs = {}) {
  return shallowMount(MobileSheet, {
    props,
    slots,
    attrs,
    global: { stubs: { UiButton: UiButtonStub } }
  })
}

describe('MobileSheet', () => {
  // ── Structure ──────────────────────────────────────────────────────────────

  test('renders the sheet root + inner element', () => {
    const wrapper = mountSheet()
    expect(wrapper.find('[data-testid="mobile-sheet-root"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mobile-sheet"]').exists()).toBe(true)
  })

  test('always renders the overlay target outside the overflow-hidden inner', () => {
    const wrapper = mountSheet()
    expect(wrapper.find('[data-testid="mobile-sheet__overlay"]').exists()).toBe(true)
  })

  test('always renders body slot area', () => {
    const wrapper = mountSheet()
    expect(wrapper.find('[data-testid="mobile-sheet__body"]').exists()).toBe(true)
  })

  // ── overlay slot ───────────────────────────────────────────────────────────

  test('renders overlay slot content into the overlay target', () => {
    const wrapper = mountSheet({}, { overlay: '<div data-testid="overlay-content">over</div>' })

    const overlay = wrapper.find('[data-testid="mobile-sheet__overlay"]')
    expect(overlay.find('[data-testid="overlay-content"]').exists()).toBe(true)
  })

  // ── data-theme passes through via inheritAttrs ─────────────────────────────

  test('forwards data-theme attribute to the root via inheritAttrs', () => {
    const wrapper = mountSheet({}, {}, { 'data-theme': 'blue-500' })
    expect(wrapper.find('[data-testid="mobile-sheet-root"]').attributes('data-theme')).toBe(
      'blue-500'
    )
  })

  // ── showHeader logic ───────────────────────────────────────────────────────

  test('shows default header when title prop is provided', () => {
    const wrapper = mountSheet({ title: 'My Title' })
    expect(wrapper.find('[data-testid="mobile-sheet__header"]').exists()).toBe(true)
  })

  test('hides header when no title and no header slots are provided', () => {
    const wrapper = mountSheet()
    expect(wrapper.find('[data-testid="mobile-sheet__header"]').exists()).toBe(false)
  })

  test('shows header when header-content slot is provided', () => {
    const wrapper = mountSheet({}, { 'header-content': '<span>content</span>' })
    expect(wrapper.find('[data-testid="mobile-sheet__header"]').exists()).toBe(true)
  })

  test('custom header slot replaces the default header entirely', () => {
    const wrapper = mountSheet(
      { title: 'My Title' },
      { header: '<div data-testid="custom-header">Custom</div>' }
    )
    expect(wrapper.find('[data-testid="custom-header"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mobile-sheet__header"]').exists()).toBe(false)
  })

  // ── title rendering ────────────────────────────────────────────────────────

  test('renders the title prop inside the header', () => {
    const wrapper = mountSheet({ title: 'Hello World' })
    expect(wrapper.find('[data-testid="mobile-sheet__header"]').text()).toContain('Hello World')
  })

  // ── close button + show_close_button ───────────────────────────────────────

  test('close button emits close when clicked', async () => {
    const wrapper = mountSheet({ title: 'My Sheet' })
    const closeBtn = wrapper.findComponent({ name: 'UiButton' })
    expect(closeBtn.exists()).toBe(true)
    await closeBtn.trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  test('hides the built-in close button when show_close_button is false', () => {
    const wrapper = mountSheet({ title: 'My Sheet', show_close_button: false })
    expect(wrapper.findComponent({ name: 'UiButton' }).exists()).toBe(false)
  })

  test('close button opts into play-on-tap', () => {
    const wrapper = mountSheet({ title: 'My Sheet' })
    const closeBtn = wrapper.findComponent({ name: 'UiButton' })
    expect(closeBtn.props('playOnTap')).toBe(true)
  })

  test('renders the built-in close button even when there is no header', () => {
    const wrapper = mountSheet()
    expect(wrapper.findComponent({ name: 'UiButton' }).exists()).toBe(true)
  })

  test('suppresses the built-in close button when a custom header slot is provided', () => {
    const wrapper = mountSheet({}, { header: '<div data-testid="custom-header">x</div>' })
    expect(wrapper.findComponent({ name: 'UiButton' }).exists()).toBe(false)
  })

  test('close button is inverted over a header but plain without one', () => {
    expect(mountSheet({ title: 'x' }).findComponent({ name: 'UiButton' }).props('inverted')).toBe(
      true
    )
    expect(mountSheet().findComponent({ name: 'UiButton' }).props('inverted')).toBe(false)
  })

  test('close button label defaults to "Close" and accepts a close_label override', () => {
    const def = shallowMount(MobileSheet, {
      props: { title: 'x' },
      global: { stubs: { UiButton: UiButtonSlotStub } }
    })
    expect(def.findComponent({ name: 'UiButton' }).text()).toContain('Close')

    const override = shallowMount(MobileSheet, {
      props: { title: 'x', close_label: 'Cancel' },
      global: { stubs: { UiButton: UiButtonSlotStub } }
    })
    expect(override.findComponent({ name: 'UiButton' }).text()).toContain('Cancel')
  })

  // ── default + footer slots ─────────────────────────────────────────────────

  test('renders default slot content into body', () => {
    const wrapper = mountSheet({}, { default: '<p data-testid="body-content">Body</p>' })
    expect(wrapper.find('[data-testid="body-content"]').exists()).toBe(true)
  })

  test('renders footer slot content', () => {
    const wrapper = mountSheet({}, { footer: '<p data-testid="footer-content">Footer</p>' })
    expect(wrapper.find('[data-testid="footer-content"]').exists()).toBe(true)
  })

  // ── overflow + mobile-modal variant utilities ─────────────────────────────

  test('inner container clips with overflow-hidden + rounded corners', () => {
    const wrapper = mountSheet()
    const classes = wrapper.find('[data-testid="mobile-sheet-container"]').classes()
    expect(classes).toContain('overflow-hidden')
    expect(classes).toContain('rounded-b-8')
    expect(classes).toContain('mobile-modal:rounded-b-none')
  })

  test('root wrapper carries the mobile-modal mt-auto layout flip class', () => {
    const wrapper = mountSheet()
    const classes = wrapper.find('[data-testid="mobile-sheet-root"]').classes()
    expect(classes).toContain('mobile-modal:mt-auto')
    expect(classes).toContain('relative')
  })

  // ── surface prop ───────────────────────────────────────────────────────────

  test('defaults the body surface to "standard"', () => {
    const wrapper = mountSheet()
    expect(wrapper.find('[data-testid="mobile-sheet"]').attributes('data-surface')).toBe('standard')
  })

  test('reflects surface="inverted" on the body data-surface attribute', () => {
    const wrapper = mountSheet({ surface: 'inverted' })
    expect(wrapper.find('[data-testid="mobile-sheet"]').attributes('data-surface')).toBe('inverted')
  })

  // ── header_border prop ────────────────────────────────────────────────────

  test('defaults the header border to "wave"', () => {
    const wrapper = mountSheet({ title: 'x' })
    expect(
      wrapper.find('[data-testid="mobile-sheet__header"]').attributes('data-header-border')
    ).toBe('wave')
  })

  test('reflects header_border="cloud" on the header data-header-border attribute', () => {
    const wrapper = mountSheet({ title: 'x', header_border: 'cloud' })
    expect(
      wrapper.find('[data-testid="mobile-sheet__header"]').attributes('data-header-border')
    ).toBe('cloud')
  })

  test('reflects header_border="none" on the header data-header-border attribute', () => {
    const wrapper = mountSheet({ title: 'x', header_border: 'none' })
    expect(
      wrapper.find('[data-testid="mobile-sheet__header"]').attributes('data-header-border')
    ).toBe('none')
  })
})

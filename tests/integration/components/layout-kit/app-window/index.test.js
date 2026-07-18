import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import AppWindow from '@/components/layout-kit/app-window/index.vue'

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

function mountWindow(props = {}, slots = {}, attrs = {}) {
  return shallowMount(AppWindow, {
    props,
    slots,
    attrs,
    global: { stubs: { UiButton: UiButtonStub } }
  })
}

describe('AppWindow', () => {
  // ── Structure ──────────────────────────────────────────────────────────────

  test('renders the window root + inner element', () => {
    const wrapper = mountWindow()
    expect(wrapper.find('[data-testid="app-window-root"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-window"]').exists()).toBe(true)
  })

  test('always renders the overlay target outside the overflow-hidden inner', () => {
    const wrapper = mountWindow()
    expect(wrapper.find('[data-testid="app-window__overlay"]').exists()).toBe(true)
  })

  test('always renders body slot area', () => {
    const wrapper = mountWindow()
    expect(wrapper.find('[data-testid="app-window__body"]').exists()).toBe(true)
  })

  // ── overlay slot ───────────────────────────────────────────────────────────

  test('renders overlay slot content into the overlay target', () => {
    const wrapper = mountWindow({}, { overlay: '<div data-testid="overlay-content">over</div>' })

    const overlay = wrapper.find('[data-testid="app-window__overlay"]')
    expect(overlay.find('[data-testid="overlay-content"]').exists()).toBe(true)
  })

  // ── data-theme passes through via inheritAttrs ─────────────────────────────

  test('forwards data-theme attribute to the root via inheritAttrs', () => {
    const wrapper = mountWindow({}, {}, { 'data-theme': 'blue-500' })
    expect(wrapper.find('[data-testid="app-window-root"]').attributes('data-theme')).toBe(
      'blue-500'
    )
  })

  // ── showHeader logic ───────────────────────────────────────────────────────

  test('shows default header when title prop is provided', () => {
    const wrapper = mountWindow({ title: 'My Title' })
    expect(wrapper.find('[data-testid="app-window__header"]').exists()).toBe(true)
  })

  test('hides header when no title and no header slots are provided', () => {
    const wrapper = mountWindow()
    expect(wrapper.find('[data-testid="app-window__header"]').exists()).toBe(false)
  })

  test('shows header when header-content slot is provided', () => {
    const wrapper = mountWindow({}, { 'header-content': '<span>content</span>' })
    expect(wrapper.find('[data-testid="app-window__header"]').exists()).toBe(true)
  })

  test('custom header slot replaces the default header entirely', () => {
    const wrapper = mountWindow(
      { title: 'My Title' },
      { header: '<div data-testid="custom-header">Custom</div>' }
    )
    expect(wrapper.find('[data-testid="custom-header"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-window__header"]').exists()).toBe(false)
  })

  // ── title rendering ────────────────────────────────────────────────────────

  test('renders the title prop inside the header', () => {
    const wrapper = mountWindow({ title: 'Hello World' })
    expect(wrapper.find('[data-testid="app-window__header"]').text()).toContain('Hello World')
  })

  // ── close button + show_close_button ───────────────────────────────────────

  test('close button emits close when clicked', async () => {
    const wrapper = mountWindow({ title: 'My Window' })
    const closeBtn = wrapper.findComponent({ name: 'UiButton' })
    expect(closeBtn.exists()).toBe(true)
    await closeBtn.trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  test('hides the built-in close button when show_close_button is false', () => {
    const wrapper = mountWindow({ title: 'My Window', show_close_button: false })
    expect(wrapper.findComponent({ name: 'UiButton' }).exists()).toBe(false)
  })

  test('close button opts into play-on-tap', () => {
    const wrapper = mountWindow({ title: 'My Window' })
    const closeBtn = wrapper.findComponent({ name: 'UiButton' })
    expect(closeBtn.props('playOnTap')).toBe(true)
  })

  test('close button icon defaults to "close"', () => {
    const wrapper = mountWindow({ title: 'My Window' })
    expect(wrapper.findComponent({ name: 'UiButton' }).props('iconLeft')).toBe('close')
  })

  test('close_icon prop overrides the built-in close button icon', () => {
    const wrapper = mountWindow({ title: 'My Window', close_icon: 'arrow-back' })
    expect(wrapper.findComponent({ name: 'UiButton' }).props('iconLeft')).toBe('arrow-back')
  })

  test('renders the built-in close button even when there is no header', () => {
    const wrapper = mountWindow()
    expect(wrapper.findComponent({ name: 'UiButton' }).exists()).toBe(true)
  })

  test('suppresses the built-in close button when a custom header slot is provided', () => {
    const wrapper = mountWindow({}, { header: '<div data-testid="custom-header">x</div>' })
    expect(wrapper.findComponent({ name: 'UiButton' }).exists()).toBe(false)
  })

  test('close button is inverted over a header but plain without one', () => {
    expect(mountWindow({ title: 'x' }).findComponent({ name: 'UiButton' }).props('inverted')).toBe(
      true
    )
    expect(mountWindow().findComponent({ name: 'UiButton' }).props('inverted')).toBe(false)
  })

  test('close button label defaults to "Close" and accepts a close_label override', () => {
    const def = shallowMount(AppWindow, {
      props: { title: 'x' },
      global: { stubs: { UiButton: UiButtonSlotStub } }
    })
    expect(def.findComponent({ name: 'UiButton' }).text()).toContain('Close')

    const override = shallowMount(AppWindow, {
      props: { title: 'x', close_label: 'Cancel' },
      global: { stubs: { UiButton: UiButtonSlotStub } }
    })
    expect(override.findComponent({ name: 'UiButton' }).text()).toContain('Cancel')
  })

  // ── default slot ───────────────────────────────────────────────────────────

  test('renders default slot content into body', () => {
    const wrapper = mountWindow({}, { default: '<p data-testid="body-content">Body</p>' })
    expect(wrapper.find('[data-testid="body-content"]').exists()).toBe(true)
  })

  // ── sidebar slot ───────────────────────────────────────────────────────────

  test('renders sidebar slot content', () => {
    const wrapper = mountWindow({}, { sidebar: '<div data-testid="sidebar-content">side</div>' })
    expect(wrapper.find('[data-testid="sidebar-content"]').exists()).toBe(true)
  })

  // ── overflow + mobile-modal variant utilities ─────────────────────────────

  test('inner container clips with overflow-hidden + rounded corners', () => {
    const wrapper = mountWindow()
    const classes = wrapper.find('[data-testid="app-window-container"]').classes()
    expect(classes).toContain('overflow-hidden')
    expect(classes).toContain('rounded-b-8')
    expect(classes).toContain('mobile-modal:rounded-b-none')
  })

  test('root wrapper carries the mobile-modal mt-auto layout flip class', () => {
    const wrapper = mountWindow()
    const classes = wrapper.find('[data-testid="app-window-root"]').classes()
    expect(classes).toContain('mobile-modal:mt-auto')
    expect(classes).toContain('relative')
  })

  // ── surface prop ───────────────────────────────────────────────────────────

  test('defaults the body surface to "standard"', () => {
    const wrapper = mountWindow()
    expect(wrapper.find('[data-testid="app-window"]').attributes('data-surface')).toBe('standard')
  })

  test('reflects surface="inverted" on the body data-surface attribute', () => {
    const wrapper = mountWindow({ surface: 'inverted' })
    expect(wrapper.find('[data-testid="app-window"]').attributes('data-surface')).toBe('inverted')
  })

  // ── header_border prop ────────────────────────────────────────────────────

  test('defaults the header border to "wave"', () => {
    const wrapper = mountWindow({ title: 'x' })
    expect(
      wrapper.find('[data-testid="app-window__header"]').attributes('data-header-border')
    ).toBe('wave')
  })

  test('reflects header_border="cloud" on the header data-header-border attribute', () => {
    const wrapper = mountWindow({ title: 'x', header_border: 'cloud' })
    expect(
      wrapper.find('[data-testid="app-window__header"]').attributes('data-header-border')
    ).toBe('cloud')
  })

  test('reflects header_border="none" on the header data-header-border attribute', () => {
    const wrapper = mountWindow({ title: 'x', header_border: 'none' })
    expect(
      wrapper.find('[data-testid="app-window__header"]').attributes('data-header-border')
    ).toBe('none')
  })

  // ── window_px prop ─────────────────────────────────────────────────────────

  test('applies window_px as an inline --window-px style override', () => {
    const wrapper = mountWindow({ window_px: '3rem' })
    expect(wrapper.find('[data-testid="app-window-root"]').attributes('style')).toContain(
      '--window-px: 3rem'
    )
  })
})

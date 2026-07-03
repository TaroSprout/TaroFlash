import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'

const { mockUseMatchMedia } = vi.hoisted(() => ({
  mockUseMatchMedia: vi.fn()
}))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: mockUseMatchMedia
}))

// Stub UiPopover so we control open/close behavior without real floating UI or
// Teleport. The stub renders the trigger/default/arrow slots, and exposes a
// `data-open` attribute so tests can inspect open state via the prop. It also
// emits the "close" event when a test triggers it.
const UiPopoverStub = defineComponent({
  name: 'UiPopover',
  inheritAttrs: false,
  props: ['open', 'position', 'gap', 'transition_duration', 'shadow', 'teleport'],
  emits: ['close'],
  setup(props, { slots }) {
    const attrs = useAttrs()
    return () =>
      h(
        'div',
        {
          'data-testid': attrs['data-testid'] ?? 'ui-popover-stub',
          'data-open': String(props.open)
        },
        [
          h('div', { 'data-testid': 'popover-trigger-slot' }, slots.trigger?.()),
          h('div', { 'data-testid': 'popover-default-slot' }, slots.default?.()),
          h('div', { 'data-testid': 'popover-arrow-slot' }, slots.arrow?.())
        ]
      )
  }
})

// UiButton emits 'press' on click so parent @press handlers fire.
const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  emits: ['press'],
  setup(_p, { slots, emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'button',
        {
          ...attrs,
          onClick: () => emit('press')
        },
        slots.default?.()
      )
  }
})

const PageSettingsPanelStub = defineComponent({
  name: 'PageSettingsPanel',
  setup: () => () => h('div', { 'data-testid': 'page-settings-panel-stub' })
})

import PageSettings from '@/views/deck/mode-toolbar/page-settings.vue'
import { deckViewShellKey } from '@/views/deck/composables/view-shell'

function makeShell({ is_open = false } = {}) {
  const is_page_settings_open = ref(is_open)
  const openPageSettings = vi.fn(() => {
    is_page_settings_open.value = true
  })
  const closePageSettings = vi.fn(() => {
    is_page_settings_open.value = false
  })
  return { is_page_settings_open, openPageSettings, closePageSettings }
}

function mountPageSettings(shell = makeShell(), { is_mobile = false } = {}) {
  mockUseMatchMedia.mockReturnValue(ref(is_mobile))
  return {
    wrapper: shallowMount(PageSettings, {
      global: {
        provide: { [deckViewShellKey]: shell },
        stubs: {
          UiPopover: UiPopoverStub,
          UiButton: UiButtonStub,
          PageSettingsPanel: PageSettingsPanelStub
        }
      }
    }),
    shell
  }
}

describe('PageSettings (mode-toolbar)', () => {
  beforeEach(() => {
    mockUseMatchMedia.mockReset()
  })

  // ── Trigger toggle ────────────────────────────────────────────────────────

  test('clicking the trigger opens the shared page settings state', async () => {
    const { wrapper, shell } = mountPageSettings()
    const trigger = wrapper.find('[data-testid="page-settings__trigger"]')
    await trigger.trigger('click')
    expect(shell.openPageSettings).toHaveBeenCalledOnce()
    expect(wrapper.find('[data-testid="page-settings"]').attributes('data-open')).toBe('true')
  })

  test('clicking the trigger again closes it', async () => {
    const { wrapper, shell } = mountPageSettings()
    const trigger = wrapper.find('[data-testid="page-settings__trigger"]')
    await trigger.trigger('click')
    await trigger.trigger('click')
    expect(shell.closePageSettings).toHaveBeenCalledOnce()
    expect(wrapper.find('[data-testid="page-settings"]').attributes('data-open')).toBe('false')
  })

  // ── desktop_open gating [obligation] ───────────────────────────────────────
  // Regression: the desktop popover is only CSS-hidden below `md`, still
  // mounted — so its own `open` prop must be false on mobile even when the
  // shared is_page_settings_open flag is true (set by the mobile footer's
  // panel), or its outside-click listener treats footer taps as "click outside".

  test('desktop_open is false on mobile even when is_page_settings_open is true [obligation]', () => {
    const shell = makeShell({ is_open: true })
    const { wrapper } = mountPageSettings(shell, { is_mobile: true })
    expect(wrapper.find('[data-testid="page-settings"]').attributes('data-open')).toBe('false')
  })

  test('desktop_open is true above mobile when is_page_settings_open is true [obligation]', () => {
    const shell = makeShell({ is_open: true })
    const { wrapper } = mountPageSettings(shell, { is_mobile: false })
    expect(wrapper.find('[data-testid="page-settings"]').attributes('data-open')).toBe('true')
  })

  test('desktop_open is false above mobile when is_page_settings_open is false', () => {
    const shell = makeShell({ is_open: false })
    const { wrapper } = mountPageSettings(shell, { is_mobile: false })
    expect(wrapper.find('[data-testid="page-settings"]').attributes('data-open')).toBe('false')
  })

  // ── data-active on trigger tracks desktop_open ─────────────────────────────

  test('trigger data-active reflects desktop_open, not raw is_page_settings_open [obligation]', () => {
    const shell = makeShell({ is_open: true })
    const { wrapper } = mountPageSettings(shell, { is_mobile: true })
    expect(wrapper.find('[data-testid="page-settings__trigger"]').attributes('data-active')).toBe(
      'false'
    )
  })

  // ── Panel content delegation ────────────────────────────────────────────────

  test('renders page-settings-panel inside the popover', () => {
    const { wrapper } = mountPageSettings()
    expect(wrapper.find('[data-testid="page-settings-panel-stub"]').exists()).toBe(true)
  })

  // ── Popover close handler ─────────────────────────────────────────────────

  test('popover close event calls closePageSettings (covers the close handler)', async () => {
    const { wrapper, shell } = mountPageSettings()
    await wrapper.find('[data-testid="page-settings__trigger"]').trigger('click')
    await wrapper.findComponent({ name: 'UiPopover' }).vm.$emit('close')
    expect(shell.closePageSettings).toHaveBeenCalledOnce()
  })
})

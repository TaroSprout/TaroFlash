import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx
}))

// Stub UiPopover so we control open/close behavior without real floating UI or
// Teleport. The stub renders the trigger and default slots, and exposes a
// `data-open` attribute so tests can inspect open state via the prop. It also
// emits the "close" event when a test triggers it.
const UiPopoverStub = defineComponent({
  name: 'UiPopover',
  inheritAttrs: false,
  props: ['open', 'position', 'gap', 'transition_duration', 'shadow', 'teleport'],
  emits: ['close'],
  setup(props, { slots, emit }) {
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

// UiButton forwards click events via attrs so the parent @click handler fires.
const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  setup(_p, { slots }) {
    const attrs = useAttrs()
    return () =>
      h(
        'button',
        {
          ...attrs,
          onClick: attrs.onClick
        },
        slots.default?.()
      )
  }
})

const SectionListStub = defineComponent({
  name: 'SectionList',
  setup(_p, { slots }) {
    return () => h('div', { 'data-testid': 'section-list-stub' }, slots.default?.())
  }
})

const LabeledSectionStub = defineComponent({
  name: 'LabeledSection',
  setup(_p, { slots }) {
    return () => h('div', { 'data-testid': 'labeled-section-stub' }, slots.default?.())
  }
})

import PageSettings from '@/views/deck/mode-toolbar/page-settings.vue'
import { deckViewShellKey } from '@/composables/deck/view-shell'

function makeEditor({ grid_size_val = 'md' } = {}) {
  const grid_size = ref(grid_size_val)
  const setGridSize = vi.fn((size) => {
    grid_size.value = size
  })
  return { grid_size, setGridSize }
}

function mountPageSettings(editor = makeEditor()) {
  return {
    wrapper: shallowMount(PageSettings, {
      global: {
        provide: { [deckViewShellKey]: editor },
        stubs: {
          UiPopover: UiPopoverStub,
          UiButton: UiButtonStub,
          SectionList: SectionListStub,
          LabeledSection: LabeledSectionStub
        }
      }
    }),
    editor
  }
}

describe('PageSettings', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
  })

  // ── Trigger toggle ────────────────────────────────────────────────────────

  test('clicking the trigger opens the popover', async () => {
    const { wrapper } = mountPageSettings()
    const trigger = wrapper.find('[data-testid="page-settings__trigger"]')
    await trigger.trigger('click')
    expect(wrapper.find('[data-testid="page-settings"]').attributes('data-open')).toBe('true')
  })

  test('clicking the trigger again closes the popover', async () => {
    const { wrapper } = mountPageSettings()
    const trigger = wrapper.find('[data-testid="page-settings__trigger"]')
    await trigger.trigger('click')
    await trigger.trigger('click')
    expect(wrapper.find('[data-testid="page-settings"]').attributes('data-open')).toBe('false')
  })

  // ── Size options mapping ──────────────────────────────────────────────────

  test('renders three card size options: base, md, xl [obligation]', () => {
    const { wrapper } = mountPageSettings()
    expect(wrapper.find('[data-testid="page-settings__card-size-option-base"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="page-settings__card-size-option-md"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="page-settings__card-size-option-xl"]').exists()).toBe(true)
  })

  test('Dense option maps to size base [obligation]', () => {
    const { wrapper } = mountPageSettings()
    const label = wrapper.find('[data-testid="page-settings__card-size-label-base"]')
    expect(label.text()).toBe('Dense')
  })

  test('Balanced option maps to size md [obligation]', () => {
    const { wrapper } = mountPageSettings()
    const label = wrapper.find('[data-testid="page-settings__card-size-label-md"]')
    expect(label.text()).toBe('Balanced')
  })

  test('Full option maps to size xl [obligation]', () => {
    const { wrapper } = mountPageSettings()
    const label = wrapper.find('[data-testid="page-settings__card-size-label-xl"]')
    expect(label.text()).toBe('Full')
  })

  // ── Active state ──────────────────────────────────────────────────────────

  test('option matching grid_size has data-active="true" [obligation]', () => {
    const { wrapper } = mountPageSettings(makeEditor({ grid_size_val: 'md' }))
    expect(
      wrapper.find('[data-testid="page-settings__card-size-option-md"]').attributes('data-active')
    ).toBe('true')
    expect(
      wrapper.find('[data-testid="page-settings__card-size-option-base"]').attributes('data-active')
    ).toBe('false')
    expect(
      wrapper.find('[data-testid="page-settings__card-size-option-xl"]').attributes('data-active')
    ).toBe('false')
  })

  test('active option tracks the current grid_size reactively', async () => {
    const editor = makeEditor({ grid_size_val: 'base' })
    const { wrapper } = mountPageSettings(editor)
    expect(
      wrapper.find('[data-testid="page-settings__card-size-option-base"]').attributes('data-active')
    ).toBe('true')

    editor.grid_size.value = 'xl'
    await wrapper.vm.$nextTick()
    expect(
      wrapper.find('[data-testid="page-settings__card-size-option-xl"]').attributes('data-active')
    ).toBe('true')
    expect(
      wrapper.find('[data-testid="page-settings__card-size-option-base"]').attributes('data-active')
    ).toBe('false')
  })

  // ── Clicking a non-active option ──────────────────────────────────────────

  test('clicking a non-active option calls setGridSize with that option value [obligation]', async () => {
    const editor = makeEditor({ grid_size_val: 'md' })
    const { wrapper } = mountPageSettings(editor)
    await wrapper.find('[data-testid="page-settings__card-size-option-xl"]').trigger('click')
    expect(editor.setGridSize).toHaveBeenCalledWith('xl')
    expect(editor.grid_size.value).toBe('xl')
  })

  // ── Active re-select (no-op / powerdown) ─────────────────────────────────

  test('clicking the already-active option does NOT call setGridSize [obligation]', async () => {
    const editor = makeEditor({ grid_size_val: 'md' })
    const { wrapper } = mountPageSettings(editor)
    await wrapper.find('[data-testid="page-settings__card-size-option-md"]').trigger('click')
    expect(editor.setGridSize).not.toHaveBeenCalled()
    expect(editor.grid_size.value).toBe('md')
  })

  test('clicking the already-active option plays powerdown sfx', async () => {
    const editor = makeEditor({ grid_size_val: 'md' })
    const { wrapper } = mountPageSettings(editor)
    await wrapper.find('[data-testid="page-settings__card-size-option-md"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('ui.digi_powerdown')
  })
})

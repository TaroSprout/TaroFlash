import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

import UiSelectMenu from '@/components/ui-kit/select-menu.vue'

// ── Stub ────────────────────────────────────────────────────────────────────
// Renders the default slot (label) and exposes a `data-testid="fire-select"`
// button so tests can trigger the @select handler with a chosen option.

const UiDropdownButtonStub = defineComponent({
  name: 'UiDropdownButton',
  inheritAttrs: false,
  props: {
    options: { type: Array, default: () => [] },
    openOnTrigger: { type: Boolean, default: false },
    fullWidth: { type: Boolean, default: false },
    size: { type: String, default: undefined }
  },
  emits: ['select'],
  setup(props, { slots, emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'div',
        {
          ...attrs,
          'data-testid': attrs['data-testid'] ?? 'ui-dropdown-button-stub',
          'data-open-on-trigger': String(props.openOnTrigger),
          'data-full-width': String(props.fullWidth)
        },
        [
          slots.default?.(),
          h('button', {
            'data-testid': 'fire-select',
            onClick: () => emit('select', props.options[0])
          }),
          h('button', {
            'data-testid': 'fire-select-alt',
            onClick: () => emit('select', props.options[1])
          })
        ]
      )
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'difficulty', label: 'Difficulty' }
]

function mountSelectMenu(props = {}) {
  return shallowMount(UiSelectMenu, {
    props: { options: OPTIONS, modelValue: 'default', ...props },
    global: { stubs: { UiDropdownButton: UiDropdownButtonStub } }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('UiSelectMenu', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
  })

  test('renders the root with ui-select-menu testid', () => {
    const wrapper = mountSelectMenu()
    expect(wrapper.find('[data-testid="ui-select-menu"]').exists()).toBe(true)
  })

  test('label slot shows the label for the current modelValue', () => {
    const wrapper = mountSelectMenu({ modelValue: 'difficulty' })
    expect(wrapper.find('[data-testid="ui-select-menu__label"]').text()).toBe('Difficulty')
  })

  test('label slot updates reactively when modelValue changes', async () => {
    const wrapper = mountSelectMenu({ modelValue: 'default' })
    expect(wrapper.find('[data-testid="ui-select-menu__label"]').text()).toBe('Default')
    await wrapper.setProps({ modelValue: 'difficulty' })
    expect(wrapper.find('[data-testid="ui-select-menu__label"]').text()).toBe('Difficulty')
  })

  test('label falls back to empty string when modelValue matches no option', () => {
    const wrapper = mountSelectMenu({ modelValue: 'nonexistent' })
    expect(wrapper.find('[data-testid="ui-select-menu__label"]').text()).toBe('')
  })

  test('forwards options to the dropdown button', () => {
    const wrapper = mountSelectMenu()
    expect(wrapper.findComponent(UiDropdownButtonStub).props('options')).toEqual(OPTIONS)
  })

  test('always sets openOnTrigger and fullWidth on the dropdown button', () => {
    const wrapper = mountSelectMenu()
    const dropdown = wrapper.findComponent(UiDropdownButtonStub)
    expect(dropdown.props('openOnTrigger')).toBe(true)
    expect(dropdown.props('fullWidth')).toBe(true)
  })

  test('selecting an option emits update:modelValue with the option value', async () => {
    const wrapper = mountSelectMenu({ modelValue: 'default' })
    await wrapper.find('[data-testid="fire-select"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['default'])
  })

  // ── Sfx [obligation] ──────────────────────────────────────────────────────

  test('picking a different option plays ui.select [obligation]', async () => {
    const wrapper = mountSelectMenu({ modelValue: 'default' })
    await wrapper.find('[data-testid="fire-select-alt"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('ui.select')
  })

  test('picking the already-selected option plays ui.deselect [obligation]', async () => {
    const wrapper = mountSelectMenu({ modelValue: 'default' })
    await wrapper.find('[data-testid="fire-select"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('ui.deselect')
  })

  // ── size prop [obligation] ────────────────────────────────────────────────

  test('defaults size to "base" on the dropdown button [obligation]', () => {
    const wrapper = mountSelectMenu()
    expect(wrapper.findComponent(UiDropdownButtonStub).props('size')).toBe('base')
  })

  test('forwards an explicit size to the dropdown button [obligation]', () => {
    const wrapper = mountSelectMenu({ size: 'sm' })
    expect(wrapper.findComponent(UiDropdownButtonStub).props('size')).toBe('sm')
  })

  test('extra attrs (e.g. data-theme) fall through to the dropdown button', () => {
    const wrapper = shallowMount(UiSelectMenu, {
      props: { options: OPTIONS, modelValue: 'default' },
      attrs: { 'data-theme': 'red-500' },
      global: { stubs: { UiDropdownButton: UiDropdownButtonStub } }
    })
    expect(wrapper.find('[data-testid="ui-select-menu"]').attributes('data-theme')).toBe('red-500')
  })
})

import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'
import UiSelectMenu from '@/components/ui-kit/select-menu.vue'

// ── Stub ────────────────────────────────────────────────────────────────────
// Renders the default slot (label) and exposes a `data-testid="fire-select"`
// button so tests can trigger the @select handler with a chosen option.

const UiDropdownButtonStub = defineComponent({
  name: 'UiDropdownButton',
  inheritAttrs: false,
  props: {
    options: { type: Array, default: () => [] },
    triggerTheme: String,
    triggerThemeDark: String,
    menuTheme: String,
    menuThemeDark: String,
    menuClass: String,
    openOnTrigger: { type: Boolean, default: false },
    fullWidth: { type: Boolean, default: false }
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
          'data-full-width': String(props.fullWidth),
          'data-trigger-theme': props.triggerTheme,
          'data-trigger-theme-dark': props.triggerThemeDark,
          'data-menu-theme': props.menuTheme,
          'data-menu-theme-dark': props.menuThemeDark,
          'data-menu-class': props.menuClass
        },
        [
          slots.default?.(),
          h('button', {
            'data-testid': 'fire-select',
            onClick: () => emit('select', props.options[0])
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

  test('defaults menuTheme to brown-200 and menuThemeDark to stone-700', () => {
    const wrapper = mountSelectMenu()
    const dropdown = wrapper.findComponent(UiDropdownButtonStub)
    expect(dropdown.props('menuTheme')).toBe('brown-200')
    expect(dropdown.props('menuThemeDark')).toBe('stone-700')
  })

  test('a custom menuTheme/menuThemeDark prop is passed through', () => {
    const wrapper = mountSelectMenu({ menuTheme: 'blue-500', menuThemeDark: 'blue-650' })
    const dropdown = wrapper.findComponent(UiDropdownButtonStub)
    expect(dropdown.props('menuTheme')).toBe('blue-500')
    expect(dropdown.props('menuThemeDark')).toBe('blue-650')
  })

  test('defaults menuClass to the outline utility classes', () => {
    const wrapper = mountSelectMenu()
    expect(wrapper.findComponent(UiDropdownButtonStub).props('menuClass')).toBe(
      'outline-1 outline-brown-100 dark:outline-grey-900'
    )
  })

  test('a custom menuClass prop overrides the default', () => {
    const wrapper = mountSelectMenu({ menuClass: 'custom-class' })
    expect(wrapper.findComponent(UiDropdownButtonStub).props('menuClass')).toBe('custom-class')
  })

  test('triggerTheme/triggerThemeDark default to undefined [obligation]', () => {
    // They must not default to a hardcoded color — otherwise callers that
    // never pass them would stop inheriting the trigger's color from the
    // popover's data-theme via CSS cascade.
    const wrapper = mountSelectMenu()
    const dropdown = wrapper.findComponent(UiDropdownButtonStub)
    expect(dropdown.props('triggerTheme')).toBeUndefined()
    expect(dropdown.props('triggerThemeDark')).toBeUndefined()
  })

  test('a supplied triggerTheme/triggerThemeDark is forwarded to the dropdown button [obligation]', () => {
    const wrapper = mountSelectMenu({ triggerTheme: 'blue-500', triggerThemeDark: 'blue-650' })
    const dropdown = wrapper.findComponent(UiDropdownButtonStub)
    expect(dropdown.props('triggerTheme')).toBe('blue-500')
    expect(dropdown.props('triggerThemeDark')).toBe('blue-650')
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

  test('extra attrs (e.g. data-theme) fall through to the dropdown button', () => {
    const wrapper = shallowMount(UiSelectMenu, {
      props: { options: OPTIONS, modelValue: 'default' },
      attrs: { 'data-theme': 'red-500' },
      global: { stubs: { UiDropdownButton: UiDropdownButtonStub } }
    })
    expect(wrapper.find('[data-testid="ui-select-menu"]').attributes('data-theme')).toBe('red-500')
  })
})

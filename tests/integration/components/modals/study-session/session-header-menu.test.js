import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import SessionHeaderMenu from '@/views/study-session/session-header-menu.vue'

// ── Stubs ─────────────────────────────────────────────────────────────────────

// Captures the options prop passed to the dropdown so tests can inspect
// disabled flags / labels without dealing with the real popover/floating-ui.
let capturedOptions = []

const DropdownButtonStub = defineComponent({
  name: 'UiDropdownButton',
  emits: ['select'],
  props: ['options'],
  setup(props, { emit }) {
    capturedOptions = props.options ?? []
    return () =>
      h(
        'div',
        { 'data-testid': 'session-header__menu' },
        capturedOptions.map((option) =>
          h(
            'button',
            {
              'data-testid': `dropdown-select-${option.value}`,
              onClick: () => emit('select', option)
            },
            option.label
          )
        )
      )
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountMenu(props = {}) {
  capturedOptions = []
  return mount(SessionHeaderMenu, {
    props,
    global: { stubs: { UiDropdownButton: DropdownButtonStub } }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SessionHeaderMenu', () => {
  test('renders the dropdown menu', () => {
    const wrapper = mountMenu()
    expect(wrapper.find('[data-testid="session-header__menu"]').exists()).toBe(true)
  })

  test('provides exactly four options (edit, move, delete, toggle-ratings)', () => {
    mountMenu()
    expect(capturedOptions).toHaveLength(4)
    expect(capturedOptions.map((o) => o.value)).toEqual([
      'edit',
      'move',
      'delete',
      'toggle-ratings'
    ])
  })

  // ── can_edit gates edit/move/delete [obligation] ───────────────────────────

  test('edit/move/delete options are disabled when can_edit is false [obligation]', () => {
    mountMenu({ can_edit: false })
    const action_options = capturedOptions.filter((o) => o.value !== 'toggle-ratings')
    expect(action_options).toHaveLength(3)
    expect(action_options.every((o) => o.disabled === true)).toBe(true)
  })

  test('edit/move/delete options are enabled when can_edit is true [obligation]', () => {
    mountMenu({ can_edit: true })
    const action_options = capturedOptions.filter((o) => o.value !== 'toggle-ratings')
    expect(action_options).toHaveLength(3)
    expect(action_options.every((o) => o.disabled === false)).toBe(true)
  })

  // ── toggle-ratings label swaps on show_all_ratings [obligation] ───────────

  test('show_all_ratings=false → toggle-ratings label offers to disable simple ratings [obligation]', () => {
    mountMenu({ show_all_ratings: false })
    const toggle_option = capturedOptions.find((o) => o.value === 'toggle-ratings')
    expect(toggle_option.label).toBe('Advanced Ratings')
  })

  test('show_all_ratings=true → toggle-ratings label offers to enable simple ratings [obligation]', () => {
    mountMenu({ show_all_ratings: true })
    const toggle_option = capturedOptions.find((o) => o.value === 'toggle-ratings')
    expect(toggle_option.label).toBe('Simple Ratings')
  })

  // ── selecting each option emits the matching event [obligation] ──────────

  test('selecting edit emits "edit" [obligation]', async () => {
    const wrapper = mountMenu({ can_edit: true })
    await wrapper.find('[data-testid="dropdown-select-edit"]').trigger('click')
    expect(wrapper.emitted('edit')).toHaveLength(1)
  })

  test('selecting move emits "move" [obligation]', async () => {
    const wrapper = mountMenu({ can_edit: true })
    await wrapper.find('[data-testid="dropdown-select-move"]').trigger('click')
    expect(wrapper.emitted('move')).toHaveLength(1)
  })

  test('selecting delete emits "delete" [obligation]', async () => {
    const wrapper = mountMenu({ can_edit: true })
    await wrapper.find('[data-testid="dropdown-select-delete"]').trigger('click')
    expect(wrapper.emitted('delete')).toHaveLength(1)
  })

  test('selecting toggle-ratings emits "toggle-ratings" [obligation]', async () => {
    const wrapper = mountMenu()
    await wrapper.find('[data-testid="dropdown-select-toggle-ratings"]').trigger('click')
    expect(wrapper.emitted('toggle-ratings')).toHaveLength(1)
  })
})

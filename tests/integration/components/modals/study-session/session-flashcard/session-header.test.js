import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import SessionHeader from '@/components/study-session/session-flashcard/session-header.vue'

// ── Stubs ─────────────────────────────────────────────────────────────────────

// Captures the options prop so tests can inspect disabled flags.
let capturedOptions = []

const DropdownButtonStub = defineComponent({
  name: 'UiDropdownButton',
  emits: ['select'],
  props: ['options'],
  setup(props, { emit }) {
    capturedOptions = props.options ?? []
    return () =>
      h('div', { 'data-testid': 'session-header__menu' }, [
        h(
          'button',
          {
            'data-testid': 'dropdown-select-edit',
            onClick: () => emit('select', { value: 'edit', label: 'Edit' })
          },
          'Edit'
        ),
        h(
          'button',
          {
            'data-testid': 'dropdown-select-move',
            onClick: () => emit('select', { value: 'move', label: 'Move' })
          },
          'Move'
        ),
        h(
          'button',
          {
            'data-testid': 'dropdown-select-delete',
            onClick: () => emit('select', { value: 'delete', label: 'Delete' })
          },
          'Delete'
        ),
        h(
          'button',
          {
            'data-testid': 'dropdown-select-toggle-ratings',
            onClick: () => emit('select', { value: 'toggle-ratings', label: 'Toggle Ratings' })
          },
          'Toggle Ratings'
        )
      ])
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountHeader(props = {}) {
  capturedOptions = []
  return mount(SessionHeader, {
    props: {
      is_cover: false,
      can_edit: true,
      ...props
    },
    global: {
      stubs: {
        UiDropdownButton: DropdownButtonStub
      }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SessionHeader', () => {
  // ── is_cover: close vs stop button [obligation] ────────────────────────────

  test('renders close button when is_cover is true [obligation]', () => {
    const wrapper = mountHeader({ is_cover: true })
    expect(wrapper.find('[data-testid="session-header__close"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-header__stop"]').exists()).toBe(false)
  })

  test('renders stop button when is_cover is false [obligation]', () => {
    const wrapper = mountHeader({ is_cover: false })
    expect(wrapper.find('[data-testid="session-header__stop"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-header__close"]').exists()).toBe(false)
  })

  test('close button (is_cover=true) emits "stop" on press [obligation]', async () => {
    const wrapper = mountHeader({ is_cover: true })
    await wrapper.find('[data-testid="session-header__close"]').trigger('click')
    expect(wrapper.emitted('stop')).toHaveLength(1)
  })

  test('stop button (is_cover=false) emits "stop" on press [obligation]', async () => {
    const wrapper = mountHeader({ is_cover: false })
    await wrapper.find('[data-testid="session-header__stop"]').trigger('click')
    expect(wrapper.emitted('stop')).toHaveLength(1)
  })

  // ── edit menu is ALWAYS rendered [obligation] ──────────────────────────────

  test('edit menu is always rendered when can_edit is true [obligation]', () => {
    const wrapper = mountHeader({ can_edit: true })
    expect(wrapper.find('[data-testid="session-header__menu"]').exists()).toBe(true)
  })

  test('edit menu is always rendered when can_edit is false [obligation]', () => {
    const wrapper = mountHeader({ can_edit: false })
    expect(wrapper.find('[data-testid="session-header__menu"]').exists()).toBe(true)
  })

  // ── menu options carry disabled: !can_edit [obligation] ───────────────────

  test('menu now has four options (edit, move, delete, toggle-ratings) [obligation]', () => {
    mountHeader({ can_edit: true })
    expect(capturedOptions).toHaveLength(4)
  })

  test('edit/move/delete options have disabled=false when can_edit is true [obligation]', () => {
    mountHeader({ can_edit: true })
    const action_options = capturedOptions.filter((o) => o.value !== 'toggle-ratings')
    expect(action_options).toHaveLength(3)
    expect(action_options.every((o) => o.disabled === false)).toBe(true)
  })

  test('edit/move/delete options have disabled=true when can_edit is false [obligation]', () => {
    mountHeader({ can_edit: false })
    const action_options = capturedOptions.filter((o) => o.value !== 'toggle-ratings')
    expect(action_options).toHaveLength(3)
    expect(action_options.every((o) => o.disabled === true)).toBe(true)
  })

  // ── menu option events ─────────────────────────────────────────────────────

  test('selecting edit option emits "edit" event', async () => {
    const wrapper = mountHeader({ can_edit: true })
    await wrapper.find('[data-testid="dropdown-select-edit"]').trigger('click')
    expect(wrapper.emitted('edit')).toHaveLength(1)
  })

  test('selecting move option emits "move" event', async () => {
    const wrapper = mountHeader({ can_edit: true })
    await wrapper.find('[data-testid="dropdown-select-move"]').trigger('click')
    expect(wrapper.emitted('move')).toHaveLength(1)
  })

  test('selecting delete option emits "delete" event', async () => {
    const wrapper = mountHeader({ can_edit: true })
    await wrapper.find('[data-testid="dropdown-select-delete"]').trigger('click')
    expect(wrapper.emitted('delete')).toHaveLength(1)
  })

  // ── show_menu=false suppresses the menu regardless of can_edit [obligation] ─

  test('show_menu=false hides dropdown menu even when can_edit is true [obligation]', () => {
    const wrapper = mountHeader({ show_menu: false, can_edit: true })
    expect(wrapper.find('[data-testid="session-header__menu"]').exists()).toBe(false)
  })

  test('show_menu=false hides dropdown menu when can_edit is false [obligation]', () => {
    const wrapper = mountHeader({ show_menu: false, can_edit: false })
    expect(wrapper.find('[data-testid="session-header__menu"]').exists()).toBe(false)
  })

  test('show_menu=true (default) still renders dropdown menu when can_edit is true [obligation]', () => {
    // Default: show_menu defaults to true
    const wrapper = mountHeader({ show_menu: true, can_edit: true })
    expect(wrapper.find('[data-testid="session-header__menu"]').exists()).toBe(true)
  })

  // ── title renders ──────────────────────────────────────────────────────────

  test('renders title text in header', () => {
    const wrapper = mountHeader({ title: 'My Deck' })
    expect(wrapper.find('[data-testid="dialog-card-header__title"]').text()).toBe('My Deck')
  })

  // ── dialog-card-header padded=false [obligation] ───────────────────────────

  test('renders dialog-card-header with padded=false so it does not double the parent inset [obligation]', () => {
    const wrapper = mountHeader()
    const header = wrapper.find('[data-testid="session-header"]')
    expect(header.classes()).not.toContain('px-(--dialog-px)')
  })

  // ── toggle-ratings menu copy [obligation] ─────────────────────────────────

  test('show_all_ratings=true → toggle-ratings option label is "Simple Ratings" [obligation]', () => {
    mountHeader({ show_all_ratings: true })
    const toggle_option = capturedOptions.find((o) => o.value === 'toggle-ratings')
    expect(toggle_option).toBeDefined()
    expect(toggle_option.label).toBe('Simple Ratings')
  })

  test('show_all_ratings=false → toggle-ratings option label is "Advanced Ratings" [obligation]', () => {
    mountHeader({ show_all_ratings: false })
    const toggle_option = capturedOptions.find((o) => o.value === 'toggle-ratings')
    expect(toggle_option).toBeDefined()
    expect(toggle_option.label).toBe('Advanced Ratings')
  })

  test('selecting the toggle-ratings option emits "toggle-ratings" event [obligation]', async () => {
    const wrapper = mountHeader({ can_edit: true })
    await wrapper.find('[data-testid="dropdown-select-toggle-ratings"]').trigger('click')
    expect(wrapper.emitted('toggle-ratings')).toHaveLength(1)
  })
})

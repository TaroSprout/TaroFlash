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

  test('all three options have disabled=false when can_edit is true [obligation]', () => {
    mountHeader({ can_edit: true })
    expect(capturedOptions).toHaveLength(3)
    expect(capturedOptions.every((o) => o.disabled === false)).toBe(true)
  })

  test('all three options have disabled=true when can_edit is false [obligation]', () => {
    mountHeader({ can_edit: false })
    expect(capturedOptions).toHaveLength(3)
    expect(capturedOptions.every((o) => o.disabled === true)).toBe(true)
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

  // ── title renders ──────────────────────────────────────────────────────────

  test('renders title text in header', () => {
    const wrapper = mountHeader({ title: 'My Deck' })
    expect(wrapper.find('[data-testid="session-header__title"]').text()).toBe('My Deck')
  })
})

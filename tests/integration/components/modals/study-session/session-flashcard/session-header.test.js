import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import SessionHeader from '@/components/study-session/session-flashcard/session-header.vue'

// ── Stubs ─────────────────────────────────────────────────────────────────────

const SessionCounterStub = defineComponent({
  name: 'SessionCounter',
  props: ['editing', 'saving', 'current_index', 'total', 'is_cover'],
  setup() {
    return () => h('div', { 'data-testid': 'session-counter-stub' })
  }
})

const DropdownButtonStub = defineComponent({
  name: 'UiDropdownButton',
  emits: ['select'],
  props: ['options'],
  setup(props, { emit }) {
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

function mountHeader(props) {
  return mount(SessionHeader, {
    props: {
      editing: false,
      saving: false,
      current_index: 0,
      total: 3,
      is_cover: false,
      can_edit: true,
      ...props
    },
    global: {
      stubs: {
        SessionCounter: SessionCounterStub,
        UiDropdownButton: DropdownButtonStub
      }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SessionHeader', () => {
  // ── can_edit controls menu visibility [obligation] ─────────────────────────

  test('renders menu dropdown when can_edit is true [obligation]', () => {
    const wrapper = mountHeader({ can_edit: true })

    expect(wrapper.find('[data-testid="session-header__menu"]').exists()).toBe(true)
  })

  test('does NOT render menu dropdown when can_edit is false [obligation]', () => {
    const wrapper = mountHeader({ can_edit: false })

    expect(wrapper.find('[data-testid="session-header__menu"]').exists()).toBe(false)
  })

  // ── edit option emits edit event [obligation] ──────────────────────────────

  test('selecting edit option emits "edit" event [obligation]', async () => {
    const wrapper = mountHeader({ can_edit: true })

    await wrapper.find('[data-testid="dropdown-select-edit"]').trigger('click')

    expect(wrapper.emitted('edit')).toHaveLength(1)
  })

  // ── move option emits move event [obligation] ─────────────────────────────

  test('selecting move option emits "move" event [obligation]', async () => {
    const wrapper = mountHeader({ can_edit: true })

    await wrapper.find('[data-testid="dropdown-select-move"]').trigger('click')

    expect(wrapper.emitted('move')).toHaveLength(1)
  })

  // ── delete option emits delete event [obligation] ─────────────────────────

  test('selecting delete option emits "delete" event [obligation]', async () => {
    const wrapper = mountHeader({ can_edit: true })

    await wrapper.find('[data-testid="dropdown-select-delete"]').trigger('click')

    expect(wrapper.emitted('delete')).toHaveLength(1)
  })

  // ── session-counter is always rendered ────────────────────────────────────

  test('always renders session-counter', () => {
    const wrapper = mountHeader({ can_edit: false })

    expect(wrapper.find('[data-testid="session-counter-stub"]').exists()).toBe(true)
  })

  test('passes is_cover to session-counter', () => {
    const wrapper = mountHeader({ is_cover: true })

    expect(wrapper.findComponent(SessionCounterStub).props('is_cover')).toBe(true)
  })
})

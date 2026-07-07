import { describe, test, expect, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import SessionHeader from '@/components/study-session/session-flashcard/session-header.vue'

// session-header teleports into a placeholder rendered by its ancestor
// (study-session/index.vue via dialog-card's #header slot). Since teleport
// content lands outside the mounted wrapper's own DOM subtree, tests query
// `document.body` directly rather than `wrapper.find`.
const TARGET_SELECTOR = '[data-testid="study-session__header-target"]'

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
  const target = document.createElement('div')
  target.setAttribute('data-testid', 'study-session__header-target')
  document.body.appendChild(target)

  return mount(SessionHeader, {
    props: {
      is_cover: false,
      can_edit: true,
      teleport_target: TARGET_SELECTOR,
      ...props
    },
    attachTo: document.body,
    global: {
      stubs: {
        UiDropdownButton: DropdownButtonStub
      }
    }
  })
}

function findInTarget(selector) {
  return document.body.querySelector(`${TARGET_SELECTOR} ${selector}`)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SessionHeader', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  // ── teleport wiring [obligation] ────────────────────────────────────────────

  test('renders inside the teleport_target element, not in-place [obligation]', () => {
    mountHeader()
    expect(findInTarget('[data-testid="session-header"]')).not.toBeNull()
  })
  // ── is_cover: close vs stop button [obligation] ────────────────────────────

  test('renders close button when is_cover is true [obligation]', () => {
    mountHeader({ is_cover: true })
    expect(findInTarget('[data-testid="session-header__close"]')).not.toBeNull()
    expect(findInTarget('[data-testid="session-header__stop"]')).toBeNull()
  })

  test('renders stop button when is_cover is false [obligation]', () => {
    mountHeader({ is_cover: false })
    expect(findInTarget('[data-testid="session-header__stop"]')).not.toBeNull()
    expect(findInTarget('[data-testid="session-header__close"]')).toBeNull()
  })

  test('close button (is_cover=true) emits "stop" on press [obligation]', async () => {
    const wrapper = mountHeader({ is_cover: true })
    findInTarget('[data-testid="session-header__close"]').click()
    await nextTick()
    expect(wrapper.emitted('stop')).toHaveLength(1)
  })

  test('stop button (is_cover=false) emits "stop" on press [obligation]', async () => {
    const wrapper = mountHeader({ is_cover: false })
    findInTarget('[data-testid="session-header__stop"]').click()
    await nextTick()
    expect(wrapper.emitted('stop')).toHaveLength(1)
  })

  // ── edit menu is ALWAYS rendered [obligation] ──────────────────────────────

  test('edit menu is always rendered when can_edit is true [obligation]', () => {
    mountHeader({ can_edit: true })
    expect(findInTarget('[data-testid="session-header__menu"]')).not.toBeNull()
  })

  test('edit menu is always rendered when can_edit is false [obligation]', () => {
    mountHeader({ can_edit: false })
    expect(findInTarget('[data-testid="session-header__menu"]')).not.toBeNull()
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
    findInTarget('[data-testid="dropdown-select-edit"]').click()
    await nextTick()
    expect(wrapper.emitted('edit')).toHaveLength(1)
  })

  test('selecting move option emits "move" event', async () => {
    const wrapper = mountHeader({ can_edit: true })
    findInTarget('[data-testid="dropdown-select-move"]').click()
    await nextTick()
    expect(wrapper.emitted('move')).toHaveLength(1)
  })

  test('selecting delete option emits "delete" event', async () => {
    const wrapper = mountHeader({ can_edit: true })
    findInTarget('[data-testid="dropdown-select-delete"]').click()
    await nextTick()
    expect(wrapper.emitted('delete')).toHaveLength(1)
  })

  // ── show_menu=false suppresses the menu regardless of can_edit [obligation] ─

  test('show_menu=false hides dropdown menu even when can_edit is true [obligation]', () => {
    mountHeader({ show_menu: false, can_edit: true })
    expect(findInTarget('[data-testid="session-header__menu"]')).toBeNull()
  })

  test('show_menu=false hides dropdown menu when can_edit is false [obligation]', () => {
    mountHeader({ show_menu: false, can_edit: false })
    expect(findInTarget('[data-testid="session-header__menu"]')).toBeNull()
  })

  test('show_menu=true (default) still renders dropdown menu when can_edit is true [obligation]', () => {
    // Default: show_menu defaults to true
    mountHeader({ show_menu: true, can_edit: true })
    expect(findInTarget('[data-testid="session-header__menu"]')).not.toBeNull()
  })

  // ── title renders ──────────────────────────────────────────────────────────

  test('renders title text in header', () => {
    mountHeader({ title: 'My Deck' })
    expect(findInTarget('[data-testid="dialog-card-header__title"]').textContent).toBe('My Deck')
  })

  // ── dialog-card-header padded default (no override) [obligation] ───────────
  // session-header no longer overrides padded=false — its teleported position
  // has no ancestor padding wrapper (unlike its old in-place position), so it
  // relies on dialog-card-header's own default (padded=true).

  test('renders dialog-card-header without a padded override, so its own default (true) applies [obligation]', () => {
    mountHeader()
    const header = findInTarget('[data-testid="session-header"]')
    expect(header.classList.contains('px-(--dialog-px)')).toBe(true)
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
    findInTarget('[data-testid="dropdown-select-toggle-ratings"]').click()
    await nextTick()
    expect(wrapper.emitted('toggle-ratings')).toHaveLength(1)
  })
})

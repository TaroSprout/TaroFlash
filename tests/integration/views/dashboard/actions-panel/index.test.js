import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockStartStudy, mockCreateDeck, mockEmitSfx } = vi.hoisted(() => ({
  mockStartStudy: vi.fn(),
  mockCreateDeck: vi.fn(() => Promise.resolve({ id: 1 })),
  mockEmitSfx: vi.fn()
}))

vi.mock('@/views/study-session/composables/study-modal', () => ({
  useStudyModal: () => ({ start: mockStartStudy })
}))

vi.mock('@/composables/deck/actions', () => ({
  useDeckActions: () => ({ createDeck: mockCreateDeck })
}))

vi.mock('@/stores/member', () => ({
  useMemberStore: () => ({ display_name: 'Ada', cover: {} })
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitHoverSfx: vi.fn()
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const PolaroidStub = defineComponent({
  name: 'DashboardActionsPanelPolaroid',
  setup() {
    return () => h('div', { 'data-testid': 'dashboard-actions-panel__polaroid' })
  }
})

const UiOptionsPanelStub = defineComponent({
  name: 'UiOptionsPanel',
  props: ['entries'],
  emits: ['select'],
  setup(props, { emit }) {
    return () =>
      h(
        'div',
        { 'data-testid': 'dashboard-actions-panel__deck-options' },
        props.entries.map((entry) =>
          h('button', {
            key: entry.value,
            'data-testid': `entry-${entry.value}`,
            'data-disabled': String(!!entry.disabled),
            onClick: () => emit('select', entry.value)
          })
        )
      )
  }
})

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  emits: ['press'],
  setup(props, { slots, emit }) {
    const attrs = useAttrs()
    return () => h('button', { ...attrs, onClick: () => emit('press') }, slots.default?.())
  }
})

// ── Component import (after mocks) ────────────────────────────────────────────

import DashboardActionsPanel from '@/views/dashboard/actions-panel/index.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

function wrapper_entry(wrapper) {
  const entries = wrapper.findComponent(UiOptionsPanelStub).props('entries')
  return entries.find((e) => e.value === 'edit-decks')
}

function mount(due_decks = [], editing_decks = false) {
  return shallowMount(DashboardActionsPanel, {
    props: { due_decks, editing_decks },
    global: {
      stubs: {
        DashboardActionsPanelPolaroid: PolaroidStub,
        UiOptionsPanel: UiOptionsPanelStub,
        UiButton: UiButtonStub
      }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockStartStudy.mockClear()
  mockCreateDeck.mockClear()
  mockCreateDeck.mockResolvedValue({ id: 1 })
  mockEmitSfx.mockClear()
})

describe('DashboardActionsPanel — header', () => {
  test('renders the member display name', () => {
    const wrapper = mount()
    expect(wrapper.find('[data-testid="dashboard-actions-panel__header"]').text()).toBe('Ada')
  })
})

describe('DashboardActionsPanel — study button', () => {
  test('pressing the study button starts a study session with the due decks', async () => {
    const due_decks = [{ id: 1 }, { id: 2 }]
    const wrapper = mount(due_decks)
    await wrapper.find('[data-testid="dashboard-actions-panel__study-button"]').trigger('click')
    expect(mockStartStudy).toHaveBeenCalledWith(due_decks)
  })

  test('is disabled while editing_decks is true [obligation]', () => {
    const wrapper = mount([], true)
    expect(
      wrapper.find('[data-testid="dashboard-actions-panel__study-button"]').attributes('disabled')
    ).not.toBeUndefined()
  })

  test('is enabled when editing_decks is false and there are due decks [obligation]', () => {
    const wrapper = mount([{ id: 1 }], false)
    expect(
      wrapper.find('[data-testid="dashboard-actions-panel__study-button"]').attributes('disabled')
    ).toBeUndefined()
  })

  test('is disabled when there are no due decks, even with editing_decks false [obligation]', () => {
    const wrapper = mount([], false)
    expect(
      wrapper.find('[data-testid="dashboard-actions-panel__study-button"]').attributes('disabled')
    ).not.toBeUndefined()
  })

  test('shows the no-decks-due label when due_decks is empty [obligation]', () => {
    const wrapper = mount([], false)
    expect(wrapper.find('[data-testid="dashboard-actions-panel__study-button"]').text()).toBe(
      'No Decks Due'
    )
  })

  test('shows the study label with count when due_decks is non-empty', () => {
    const wrapper = mount([{ id: 1 }, { id: 2 }], false)
    expect(wrapper.find('[data-testid="dashboard-actions-panel__study-button"]').text()).toContain(
      '2'
    )
  })
})

describe('DashboardActionsPanel — onSelect only wires new-deck', () => {
  test('selecting new-deck creates a deck and opens its settings modal [obligation]', async () => {
    const wrapper = mount()
    await wrapper.find('[data-testid="entry-new-deck"]').trigger('click')
    await Promise.resolve()
    expect(mockCreateDeck).toHaveBeenCalledWith(expect.objectContaining({ is_public: true }), {
      openSettingsAfterCreate: true
    })
  })

  test('selecting new-deck plays a press sfx', async () => {
    const wrapper = mount()
    await wrapper.find('[data-testid="entry-new-deck"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('pop_up_pop')
  })

  test('selecting new-deck while editing_decks is true does not create a deck, even bypassing the disabled UI state [obligation]', async () => {
    const wrapper = mount([], true)
    await wrapper.find('[data-testid="entry-new-deck"]').trigger('click')
    await Promise.resolve()
    expect(mockCreateDeck).not.toHaveBeenCalled()
    expect(mockEmitSfx).not.toHaveBeenCalled()
  })

  test('selecting edit-decks emits toggle-edit-decks and does not create a deck [obligation]', async () => {
    const wrapper = mount()
    await wrapper.find('[data-testid="entry-edit-decks"]').trigger('click')
    await Promise.resolve()
    expect(wrapper.emitted('toggle-edit-decks')).toHaveLength(1)
    expect(mockCreateDeck).not.toHaveBeenCalled()
    expect(mockEmitSfx).not.toHaveBeenCalled()
  })
})

describe('DashboardActionsPanel — edit-decks entry reflects editing_decks state', () => {
  test('shows the edit-decks label and pencil icon when not editing', () => {
    const wrapper = mount([], false)
    const entries = wrapper.findComponent(UiOptionsPanelStub).props('entries')
    const edit_entry = entries.find((e) => e.value === 'edit-decks')
    expect(edit_entry.label).toBe('Edit Decks')
    expect(edit_entry.trailingIcon).toBe('pencil')
  })

  test('shows the done-editing label and stop icon when editing [obligation]', () => {
    const wrapper = mount([], true)
    const entries = wrapper.findComponent(UiOptionsPanelStub).props('entries')
    const edit_entry = entries.find((e) => e.value === 'edit-decks')
    expect(edit_entry.label).toBe('Stop Editing')
    expect(edit_entry.trailingIcon).toBe('stop')
  })

  test('carries selected/selectedTheme/selectedThemeDark reflecting editing_decks [obligation]', () => {
    const not_editing = wrapper_entry(mount([], false))
    expect(not_editing.selected).toBe(false)
    expect(not_editing.selectedTheme).toBe('yellow-500')
    expect(not_editing.selectedThemeDark).toBe('yellow-700')

    const editing = wrapper_entry(mount([], true))
    expect(editing.selected).toBe(true)
    expect(editing.selectedTheme).toBe('yellow-500')
    expect(editing.selectedThemeDark).toBe('yellow-700')
  })
})

describe('DashboardActionsPanel — re-entrancy guard while creating [obligation]', () => {
  test('disables the new-deck entry while a creation is in flight', async () => {
    let resolve_create
    mockCreateDeck.mockImplementation(() => new Promise((r) => (resolve_create = r)))
    const wrapper = mount()

    await wrapper.find('[data-testid="entry-new-deck"]').trigger('click')
    expect(wrapper.find('[data-testid="entry-new-deck"]').attributes('data-disabled')).toBe('true')

    resolve_create({ id: 1 })
    await Promise.resolve()
    await Promise.resolve()
  })

  test('a second click while creating does not trigger a second createDeck call', async () => {
    let resolve_create
    mockCreateDeck.mockImplementation(() => new Promise((r) => (resolve_create = r)))
    const wrapper = mount()

    await wrapper.find('[data-testid="entry-new-deck"]').trigger('click')
    await wrapper.find('[data-testid="entry-new-deck"]').trigger('click')

    expect(mockCreateDeck).toHaveBeenCalledTimes(1)

    resolve_create({ id: 1 })
    await Promise.resolve()
    await Promise.resolve()
  })

  test('re-enables the new-deck entry once creation settles', async () => {
    const wrapper = mount()
    await wrapper.find('[data-testid="entry-new-deck"]').trigger('click')
    await Promise.resolve()
    await Promise.resolve()
    expect(wrapper.find('[data-testid="entry-new-deck"]').attributes('data-disabled')).toBe('false')
  })
})

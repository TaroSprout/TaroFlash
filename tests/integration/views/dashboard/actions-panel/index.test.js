import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockStartStudy, mockCreateDeck, mockEmitSfx, mockOpenSettings } = vi.hoisted(() => ({
  mockStartStudy: vi.fn(),
  mockCreateDeck: vi.fn(() => Promise.resolve({ id: 1 })),
  mockEmitSfx: vi.fn(),
  mockOpenSettings: vi.fn()
}))

// Module-level (not inside vi.hoisted) so Vue's ref() is available — the
// component's template auto-unwraps this only because it's a real ref.
const mockDockOnScreen = ref(false)

vi.mock('@/views/study-session/composables/study-modal', () => ({
  useStudyModal: () => ({ start: mockStartStudy })
}))

vi.mock('@/composables/settings/use-settings-modal', () => ({
  useSettingsModal: () => ({ open: mockOpenSettings })
}))

vi.mock('@/composables/deck/actions', () => ({
  useDeckActions: () => ({ createDeck: mockCreateDeck })
}))

vi.mock('@/stores/member', () => ({
  useMemberStore: () => ({ display_name: 'Ada', cover: { avatar: 'panda' } })
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitHoverSfx: vi.fn()
}))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: () => mockDockOnScreen
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const PolaroidStub = defineComponent({
  name: 'MemberPolaroid',
  props: {
    avatar: { type: String, default: undefined },
    interactive: { type: Boolean, default: false }
  },
  setup(props) {
    return () =>
      h('div', {
        'data-testid': 'member-polaroid-stub',
        'data-avatar': props.avatar,
        'data-interactive': String(props.interactive)
      })
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

const DashboardActionsPanelShellStub = defineComponent({
  name: 'DashboardActionsPanelShell',
  inheritAttrs: false,
  setup(_props, { slots }) {
    const attrs = useAttrs()
    return () => h('div', { ...attrs }, [slots.polaroid?.(), slots.header?.(), slots.body?.()])
  }
})

// ── Component import (after mocks) ────────────────────────────────────────────

import DashboardActionsPanel from '@/views/dashboard/actions-panel/index.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

function wrapper_entry(wrapper) {
  const entries = wrapper.findComponent(UiOptionsPanelStub).props('entries')
  return entries.find((e) => e.value === 'edit-decks')
}

function mount(due_decks = [], editing_decks = false, has_decks = false, global_overrides = {}) {
  return shallowMount(DashboardActionsPanel, {
    props: { due_decks, editing_decks, has_decks },
    global: {
      stubs: {
        DashboardActionsPanelShell: DashboardActionsPanelShellStub,
        MemberPolaroid: PolaroidStub,
        UiOptionsPanel: UiOptionsPanelStub,
        UiButton: UiButtonStub
      },
      directives: { sfx: {} },
      ...global_overrides
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockStartStudy.mockClear()
  mockCreateDeck.mockClear()
  mockCreateDeck.mockResolvedValue({ id: 1 })
  mockEmitSfx.mockClear()
  mockOpenSettings.mockClear()
  mockDockOnScreen.value = false
})

describe('DashboardActionsPanel — header', () => {
  test('renders the member display name', () => {
    const wrapper = mount()
    expect(wrapper.find('[data-testid="dashboard-actions-panel__header"]').text()).toBe('Ada')
  })

  test('exposes the full display name via the title attribute', () => {
    const wrapper = mount()
    expect(
      wrapper.find('[data-testid="dashboard-actions-panel__header"]').attributes('title')
    ).toBe('Ada')
  })

  test('passes the member store avatar into the interactive polaroid [obligation]', () => {
    const wrapper = mount()
    const polaroid = wrapper.find('[data-testid="member-polaroid-stub"]')
    expect(polaroid.attributes('data-avatar')).toBe('panda')
    expect(polaroid.attributes('data-interactive')).toBe('true')
  })

  test('the wrapper div carries the positioning classes moved off the polaroid [obligation]', () => {
    const wrapper = mount()
    const polaroid_wrapper = wrapper.find('[data-testid="dashboard-actions-panel__polaroid"]')
    expect(polaroid_wrapper.classes()).toContain('absolute')
    expect(polaroid_wrapper.classes()).toContain('top-1')
    expect(polaroid_wrapper.classes()).toContain('-left-1')
    expect(polaroid_wrapper.classes()).toContain('z-10')
  })

  // `group` is load-bearing: the polaroid's swing is a `group-hover:` class, so
  // it only ever fires if the wrapper opens the group. `cursor-pointer` is the
  // affordance that says the polaroid is clickable at all.
  test('the wrapper div opens the hover group and shows the click affordance [obligation]', () => {
    const wrapper = mount()
    const polaroid_wrapper = wrapper.find('[data-testid="dashboard-actions-panel__polaroid"]')
    expect(polaroid_wrapper.classes()).toContain('group')
    expect(polaroid_wrapper.classes()).toContain('cursor-pointer')
  })

  test('clicking the polaroid wrapper opens the settings modal on its default tab [obligation]', async () => {
    const wrapper = mount()
    await wrapper.find('[data-testid="dashboard-actions-panel__polaroid"]').trigger('click')
    expect(mockOpenSettings).toHaveBeenCalledWith()
  })

  test('clicking the polaroid wrapper plays no sound [obligation]', async () => {
    const wrapper = mount()
    await wrapper.find('[data-testid="dashboard-actions-panel__polaroid"]').trigger('click')
    expect(mockEmitSfx).not.toHaveBeenCalled()
  })

  test('the polaroid wrapper wires v-sfx hover to ui.hover, with no click channel [obligation]', () => {
    let captured
    const captureDirective = {
      mounted: (_el, binding) => (captured = binding.value),
      updated: (_el, binding) => (captured = binding.value)
    }
    mount([], false, false, { directives: { sfx: captureDirective } })

    expect(captured.hover).toBe('ui.hover')
    expect(captured.click).toBeUndefined()
  })
})

describe('DashboardActionsPanel — study button', () => {
  test('pressing the study button starts a study session with the due decks', async () => {
    const due_decks = [
      { id: 1, due_count: 2 },
      { id: 2, due_count: 1 }
    ]
    const wrapper = mount(due_decks)
    await wrapper.find('[data-testid="dashboard-actions-panel__study-button"]').trigger('click')
    expect(mockStartStudy).toHaveBeenCalledWith(due_decks.map((deck) => deck.id))
  })

  test('is disabled while editing_decks is true [obligation]', () => {
    const wrapper = mount([{ id: 1, due_count: 3 }], true)
    expect(
      wrapper.find('[data-testid="dashboard-actions-panel__study-button"]').attributes('disabled')
    ).not.toBeUndefined()
  })

  test('is enabled when editing_decks is false and there are due cards [obligation]', () => {
    const wrapper = mount([{ id: 1, due_count: 1 }], false)
    expect(
      wrapper.find('[data-testid="dashboard-actions-panel__study-button"]').attributes('disabled')
    ).toBeUndefined()
  })

  // [obligation] zero due cards disables the button and swaps in the reused no-decks-due-label key.
  test('is disabled and shows "No Cards Due" when the total due card count is zero [obligation]', () => {
    const wrapper = mount([{ id: 1, due_count: 0 }], false)
    const button = wrapper.find('[data-testid="dashboard-actions-panel__study-button"]')
    expect(button.attributes('disabled')).not.toBeUndefined()
    expect(button.text()).toBe('No Cards Due')
  })

  // [obligation] singular branch of "Study {count} Card | Study {count} Cards".
  test('shows the singular label for exactly one due card [obligation]', () => {
    const wrapper = mount([{ id: 1, due_count: 1 }], false)
    expect(wrapper.find('[data-testid="dashboard-actions-panel__study-button"]').text()).toBe(
      'Study 1 Card'
    )
  })

  // [obligation] plural branch, summed across decks.
  test('shows the plural label with the summed due card count [obligation]', () => {
    const wrapper = mount(
      [
        { id: 1, due_count: 3 },
        { id: 2, due_count: 2 }
      ],
      false
    )
    expect(wrapper.find('[data-testid="dashboard-actions-panel__study-button"]').text()).toBe(
      'Study 5 Cards'
    )
  })
})

describe('DashboardActionsPanel — study button emphasis swap with the dock [obligation]', () => {
  test('drops data-palette and goes neutral when the mobile dock is on screen', () => {
    mockDockOnScreen.value = true
    const wrapper = mount([{ id: 1, due_count: 1 }], false)
    const button = wrapper.find('[data-testid="dashboard-actions-panel__study-button"]')
    expect(button.attributes('data-palette')).toBeUndefined()
    expect(button.attributes('neutral')).toBe('true')
  })

  test('renders data-palette="brand" and drops neutral when the mobile dock is off screen', () => {
    mockDockOnScreen.value = false
    const wrapper = mount([{ id: 1, due_count: 1 }], false)
    const button = wrapper.find('[data-testid="dashboard-actions-panel__study-button"]')
    expect(button.attributes('data-palette')).toBe('brand')
    expect(button.attributes('neutral')).toBe('false')
  })
})

describe('DashboardActionsPanel — onSelect only wires new-deck', () => {
  test('selecting new-deck creates a deck with a single argument, no options object [obligation]', async () => {
    const wrapper = mount()
    await wrapper.find('[data-testid="entry-new-deck"]').trigger('click')
    await Promise.resolve()
    expect(mockCreateDeck).toHaveBeenCalledWith(expect.objectContaining({ is_public: true }))
    expect(mockCreateDeck.mock.calls[0]).toHaveLength(1)
  })

  test('selecting new-deck plays a press sfx', async () => {
    const wrapper = mount()
    await wrapper.find('[data-testid="entry-new-deck"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('dialog.open')
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

  test('carries selected/selectedPalette reflecting editing_decks [obligation]', () => {
    const not_editing = wrapper_entry(mount([], false))
    expect(not_editing.selected).toBe(false)
    expect(not_editing.selectedPalette).toBe('yellow')

    const editing = wrapper_entry(mount([], true))
    expect(editing.selected).toBe(true)
    expect(editing.selectedPalette).toBe('yellow')
  })
})

describe('DashboardActionsPanel — edit-decks entry disabled when no decks', () => {
  test('is disabled when has_decks is false and not editing', () => {
    const entry = wrapper_entry(mount([], false, false))
    expect(entry.disabled).toBe(true)
  })

  test('is enabled when has_decks is true and not editing', () => {
    const entry = wrapper_entry(mount([], false, true))
    expect(entry.disabled).toBe(false)
  })

  test('done-editing state is never disabled, even with no decks', () => {
    const entry = wrapper_entry(mount([], true, false))
    expect(entry.disabled).toBe(false)
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

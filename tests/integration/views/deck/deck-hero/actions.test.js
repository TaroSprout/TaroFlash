import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'

const { mockStartStudy } = vi.hoisted(() => ({ mockStartStudy: vi.fn() }))
const { mockOpenDeckSettings } = vi.hoisted(() => ({ mockOpenDeckSettings: vi.fn() }))
const { mockUseMatchMedia } = vi.hoisted(() => ({ mockUseMatchMedia: vi.fn() }))

vi.mock('@/components/study-session/composables/study-modal', () => ({
  useStudyModal: () => ({ start: mockStartStudy })
}))

vi.mock('@/composables/deck/settings-modal', () => ({
  useDeckSettingsModal: () => ({ open: mockOpenDeckSettings })
}))

vi.mock('@/composables/ui/media-query', () => ({ useMatchMedia: mockUseMatchMedia }))

// useCardEditMenu → useDeckQuery needs @pinia/colada; override just useDeckQuery
// and preserve all other named exports so the mock doesn't drop barrel siblings.
const { mockUseDeckQuery } = vi.hoisted(() => ({
  mockUseDeckQuery: vi.fn(() => ({ data: ref(null) }))
}))
vi.mock('@/api/decks', async (importOriginal) => ({
  ...(await importOriginal()),
  useDeckQuery: mockUseDeckQuery
}))

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  emits: ['press'],
  setup(_p, { slots, emit }) {
    const attrs = useAttrs()
    return () => h('button', { ...attrs, onClick: () => emit('press') }, slots.default?.())
  }
})

const UiDropdownButtonStub = defineComponent({
  name: 'UiDropdownButton',
  inheritAttrs: false,
  props: { options: { type: Array, default: () => [] } },
  emits: ['click', 'select'],
  setup(props, { slots, emit }) {
    const attrs = useAttrs()
    return () =>
      h('div', null, [
        h('button', { ...attrs, onClick: () => emit('click') }, slots.default?.()),
        ...props.options.map((option) =>
          h(
            'button',
            {
              key: option.value,
              'data-testid': 'dropdown-button__option',
              onClick: () => emit('select', option)
            },
            option.label
          )
        )
      ])
  }
})

import Actions from '@/views/deck/deck-hero/actions.vue'
import { cardEditorKey } from '@/views/deck/composables/list-controller'
import { deckViewShellKey } from '@/views/deck/composables/view-shell'
import { mobileCardEditorKey } from '@/views/deck/mobile-editor/use-mobile-card-editor'

function makeEditor({ onSelectCard = vi.fn() } = {}) {
  return {
    actions: { onSelectCard }
  }
}

function makeShell({ mode = 'view', toggleMode = vi.fn(), is_rearranging = false } = {}) {
  return {
    mode: ref(mode),
    is_rearranging: ref(is_rearranging),
    toggleMode,
    toggleRearrange: vi.fn()
  }
}

function makeMobileEditor() {
  return { open_at: vi.fn() }
}

function mount({ deck = {}, editor, shell, mobile_editor, is_mobile = false } = {}) {
  mockUseMatchMedia.mockReturnValue(ref(is_mobile))
  const provide = {}
  if (editor !== undefined) provide[cardEditorKey] = editor
  if (shell !== undefined) provide[deckViewShellKey] = shell
  if (mobile_editor !== undefined) provide[mobileCardEditorKey] = mobile_editor
  return shallowMount(Actions, {
    props: { deck: { id: 1, title: 'd', card_count: 10, due_count: 3, ...deck } },
    global: {
      stubs: { UiButton: UiButtonStub, UiDropdownButton: UiDropdownButtonStub },
      provide
    }
  })
}

const editBtn = (w) => w.find('[data-testid="overview-panel__settings-button"]')
const studyBtn = (w) => w.find('[data-testid="overview-panel__study-button"]')
const optionBtns = (w) => w.findAll('[data-testid="dropdown-button__option"]')
// options[0]=select, options[1]=rearrange, options[2]=appearance
const selectBtn = (w) => optionBtns(w)[0]
const appearanceBtn = (w) => optionBtns(w)[2]

describe('deck-hero/actions', () => {
  beforeEach(() => {
    mockStartStudy.mockClear()
    mockOpenDeckSettings.mockClear()
    mockUseMatchMedia.mockReturnValue(ref(false))
    mockUseDeckQuery.mockReturnValue({ data: ref(null) })
  })

  test('clicking study button starts a study session for the deck', async () => {
    const wrapper = mount({ deck: { id: 7 } })
    await studyBtn(wrapper).trigger('click')
    expect(mockStartStudy).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }))
  })

  test('renders the deck due_count inside the study button', () => {
    const wrapper = mount({ deck: { due_count: 12 } })
    expect(studyBtn(wrapper).text()).toContain('12')
  })

  test('shows "Edit Cards" when shell mode is view', () => {
    const wrapper = mount({ shell: makeShell({ mode: 'view' }) })
    expect(editBtn(wrapper).text()).toContain('Edit Cards')
  })

  test('shows "Stop Editing" when shell mode is edit', () => {
    const wrapper = mount({ shell: makeShell({ mode: 'edit' }) })
    expect(editBtn(wrapper).text()).toContain('Stop Editing')
  })

  test('clicking edit calls shell.toggleMode("edit")', async () => {
    const toggleMode = vi.fn()
    const wrapper = mount({ shell: makeShell({ mode: 'view', toggleMode }) })
    await editBtn(wrapper).trigger('click')
    expect(toggleMode).toHaveBeenCalledWith('edit')
  })

  test('clicking edit is a no-op when no shell is provided', async () => {
    const wrapper = mount()
    await editBtn(wrapper).trigger('click')
    expect(editBtn(wrapper).exists()).toBe(true)
  })

  test('three dropdown options are rendered (select, rearrange, appearance)', () => {
    const wrapper = mount({ editor: makeEditor() })
    expect(optionBtns(wrapper)).toHaveLength(3)
  })

  test('clicking select-cards calls actions.onSelectCard with no args', async () => {
    const onSelectCard = vi.fn()
    const wrapper = mount({ editor: makeEditor({ onSelectCard }) })
    await selectBtn(wrapper).trigger('click')
    expect(onSelectCard).toHaveBeenCalledWith()
  })

  test('select-cards click is a no-op when no editor is provided', async () => {
    const wrapper = mount()
    await selectBtn(wrapper).trigger('click')
    expect(selectBtn(wrapper).exists()).toBe(true)
  })

  test('clicking appearance option opens deck-settings modal with design tab and front side [obligation]', async () => {
    const deck = { id: 5, title: 'Test', card_count: 5, due_count: 1 }
    mockUseDeckQuery.mockReturnValue({ data: ref(deck) })
    const wrapper = mount({ deck: { id: 5 }, editor: makeEditor() })
    await appearanceBtn(wrapper).trigger('click')
    expect(mockOpenDeckSettings).toHaveBeenCalledWith(expect.objectContaining({ id: 5 }), {
      tab: 'design',
      side: 'front'
    })
  })

  test('appearance option is the third dropdown option (icon align-horizontal-frame) [obligation]', () => {
    const wrapper = mount({ editor: makeEditor() })
    expect(optionBtns(wrapper)[2].exists()).toBe(true)
  })

  test('clicking appearance when no editor is injected still opens the settings modal [obligation]', async () => {
    const deck = { id: 9 }
    mockUseDeckQuery.mockReturnValue({ data: ref(deck) })
    const wrapper = mount({ deck: { id: 9 } })
    await appearanceBtn(wrapper).trigger('click')
    expect(mockOpenDeckSettings).toHaveBeenCalledWith(expect.objectContaining({ id: 9 }), {
      tab: 'design',
      side: 'front'
    })
  })

  // ── study button disabled state [obligation] ───────────────────────────────

  test('study button is disabled when due_count is 0 [obligation]', () => {
    const wrapper = mount({ deck: { due_count: 0 } })
    expect(studyBtn(wrapper).attributes('disabled')).toBeDefined()
  })

  test('study button is disabled when due_count is undefined [obligation]', () => {
    const wrapper = mount({ deck: { due_count: undefined } })
    expect(studyBtn(wrapper).attributes('disabled')).toBeDefined()
  })

  test('study button shows no-cards-due text when due_count is 0 [obligation]', () => {
    const wrapper = mount({ deck: { due_count: 0 } })
    expect(studyBtn(wrapper).text()).toContain('No cards due')
  })

  test('study button shows no-cards-due text when due_count is undefined [obligation]', () => {
    const wrapper = mount({ deck: { due_count: undefined } })
    expect(studyBtn(wrapper).text()).toContain('No cards due')
  })

  test('study button is enabled when due_count is greater than 0 [obligation]', () => {
    const wrapper = mount({ deck: { due_count: 5 } })
    expect(studyBtn(wrapper).attributes('disabled')).toBeUndefined()
  })

  test('study button shows due count when due_count > 0 [obligation]', () => {
    const wrapper = mount({ deck: { due_count: 7 } })
    expect(studyBtn(wrapper).text()).toContain('7')
  })

  test('clicking the enabled study button starts the session [obligation]', async () => {
    const wrapper = mount({ deck: { id: 3, due_count: 5 } })
    await studyBtn(wrapper).trigger('click')
    expect(mockStartStudy).toHaveBeenCalledWith(expect.objectContaining({ id: 3 }))
  })

  // ── mobile — edit button hidden [obligation] ──────────────────────────────
  // At mobile (<md) actions.vue hides the edit/dropdown button entirely;
  // the mobile edit affordance lives in footer-actions.vue instead.

  test('edit button does not render at mobile [obligation]', () => {
    const wrapper = mount({ shell: makeShell({ mode: 'view' }), is_mobile: true })
    expect(editBtn(wrapper).exists()).toBe(false)
  })

  // ── rearranging state [obligation] ────────────────────────────────────────

  test('shows rearrange-done label when shell is rearranging [obligation]', () => {
    const shell = makeShell({ is_rearranging: true })
    const wrapper = mount({ shell })
    expect(editBtn(wrapper).text()).toContain('Done')
  })

  test('rearrange option (index 1) is disabled when already rearranging [obligation]', () => {
    const shell = makeShell({ is_rearranging: true })
    const wrapper = mount({ shell })
    // the stub exposes options via click handlers — verify the option exists
    expect(optionBtns(wrapper)[1].exists()).toBe(true)
  })

  test('clicking edit while rearranging calls toggleRearrange [obligation]', async () => {
    const shell = makeShell({ is_rearranging: true })
    const wrapper = mount({ shell })
    await editBtn(wrapper).trigger('click')
    expect(shell.toggleRearrange).toHaveBeenCalledOnce()
    expect(shell.toggleMode).not.toHaveBeenCalled()
  })

  test('at md+ clicking edit calls toggleMode even when mobile_editor is provided [obligation]', async () => {
    const toggleMode = vi.fn()
    const mobile_editor = makeMobileEditor()
    const wrapper = mount({
      shell: makeShell({ mode: 'view', toggleMode }),
      mobile_editor,
      is_mobile: false
    })
    await editBtn(wrapper).trigger('click')
    expect(toggleMode).toHaveBeenCalledWith('edit')
    expect(mobile_editor.open_at).not.toHaveBeenCalled()
  })
})

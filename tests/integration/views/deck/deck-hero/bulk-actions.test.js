import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { mount as vtuMount } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitHoverSfx: vi.fn(),
  setSfxPolicy: vi.fn()
}))

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: ['disabled'],
  emits: ['press'],
  setup(props, { slots, emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'button',
        { ...attrs, disabled: props.disabled, onClick: () => emit('press') },
        slots.default?.()
      )
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
        { 'data-testid': 'ui-options-panel' },
        props.entries.map((entry) =>
          h(
            'button',
            {
              key: entry.value,
              'data-testid': `nav-entry-${entry.value}`,
              onClick: () => emit('select', entry.value)
            },
            entry.label
          )
        )
      )
  }
})

import BulkActions from '@/views/deck/deck-hero/bulk-actions.vue'
import { cardEditorKey } from '@/views/deck/composables/list-controller'

function makeEditor({
  selected_count = 0,
  select_all_mode = false,
  all_cards_selected = false,
  toggleSelectAll = vi.fn(),
  exitSelection = vi.fn(),
  onCancelSelection = vi.fn(),
  onMoveCards = vi.fn(),
  onDeleteCards = vi.fn()
} = {}) {
  return {
    selection: {
      selected_count: ref(selected_count),
      all_cards_selected: ref(all_cards_selected),
      select_all_mode: ref(select_all_mode),
      toggleSelectAll,
      exitSelection
    },
    actions: { onCancelSelection, onMoveCards, onDeleteCards }
  }
}

function mount(editor = makeEditor()) {
  return {
    wrapper: vtuMount(BulkActions, {
      global: {
        stubs: { UiButton: UiButtonStub, UiOptionsPanel: UiOptionsPanelStub },
        provide: { [cardEditorKey]: editor }
      }
    }),
    editor
  }
}

const cancelBtn = (w) => w.find('[data-testid="bulk-actions__cancel"]')
const countTag = (w) => w.find('[data-testid="bulk-actions__count"]')
const selectAllEntry = (w) => w.find('[data-testid="nav-entry-select-all"]')
const moveEntry = (w) => w.find('[data-testid="nav-entry-move"]')
const deleteBtn = (w) => w.find('[data-testid="bulk-actions__delete"]')

describe('deck-hero/bulk-actions', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
  })

  test('select-all label shows "Select all" when not everything is selected', () => {
    const { wrapper } = mount(makeEditor({ all_cards_selected: false }))
    expect(selectAllEntry(wrapper).text()).toBe('Select all')
  })

  test('select-all label flips to "Deselect all" when everything is selected', () => {
    const { wrapper } = mount(makeEditor({ all_cards_selected: true }))
    expect(selectAllEntry(wrapper).text()).toBe('Deselect all')
  })

  test('renders the selected count in the count tag', () => {
    const { wrapper } = mount(makeEditor({ selected_count: 3 }))
    expect(countTag(wrapper).text()).toContain('3')
  })

  test('delete is disabled when nothing is selected', () => {
    const { wrapper } = mount(makeEditor({ selected_count: 0, select_all_mode: false }))
    expect(deleteBtn(wrapper).attributes('disabled')).toBeDefined()
  })

  test('delete is enabled when something is selected', () => {
    const { wrapper } = mount(makeEditor({ selected_count: 2 }))
    expect(deleteBtn(wrapper).attributes('disabled')).toBeUndefined()
  })

  test('delete is enabled in select-all mode even when count is zero', () => {
    const { wrapper } = mount(makeEditor({ select_all_mode: true, selected_count: 0 }))
    expect(deleteBtn(wrapper).attributes('disabled')).toBeUndefined()
  })

  test('clicking cancel calls actions.onCancelSelection', async () => {
    const { wrapper, editor } = mount()
    await cancelBtn(wrapper).trigger('click')
    expect(editor.actions.onCancelSelection).toHaveBeenCalledOnce()
  })

  test('navigating select-all emits ui.select sfx and calls toggleSelectAll', async () => {
    const { wrapper, editor } = mount()
    await selectAllEntry(wrapper).trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('select')
    expect(editor.selection.toggleSelectAll).toHaveBeenCalledOnce()
  })

  test('navigating move calls actions.onMoveCards', async () => {
    const { wrapper, editor } = mount(makeEditor({ selected_count: 1 }))
    await moveEntry(wrapper).trigger('click')
    expect(editor.actions.onMoveCards).toHaveBeenCalledOnce()
  })

  test('clicking delete calls actions.onDeleteCards', async () => {
    const { wrapper, editor } = mount(makeEditor({ selected_count: 1 }))
    await deleteBtn(wrapper).trigger('click')
    expect(editor.actions.onDeleteCards).toHaveBeenCalledOnce()
  })
})

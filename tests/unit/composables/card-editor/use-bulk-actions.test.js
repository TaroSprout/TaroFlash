import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { createApp, ref } from 'vue'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key })
}))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

import { useBulkActions } from '@/views/deck/composables/bulk-actions'
import { cardEditorKey } from '@/views/deck/composables/list-controller'

function makeEditor({
  selected_count = 0,
  select_all_mode = false,
  all_cards_selected = false
} = {}) {
  return {
    selection: {
      selected_count: ref(selected_count),
      all_cards_selected: ref(all_cards_selected),
      select_all_mode: ref(select_all_mode),
      toggleSelectAll: vi.fn(),
      exitSelection: vi.fn()
    },
    actions: {
      onMoveCards: vi.fn(),
      onDeleteCards: vi.fn(),
      onCancelSelection: vi.fn()
    }
  }
}

function withSetup(composable, { provide } = {}) {
  let result
  const app = createApp({
    setup() {
      result = composable()
      return () => {}
    }
  })
  if (provide) {
    const entries = Array.isArray(provide) ? provide : Object.entries(provide)
    entries.forEach(([k, v]) => app.provide(k, v))
  }
  app.mount(document.createElement('div'))
  return [result, app]
}

let app

describe('useBulkActions', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
  })

  function setup(opts) {
    const editor = makeEditor(opts)
    const [result, _app] = withSetup(useBulkActions, {
      provide: [[cardEditorKey, editor]]
    })
    app = _app
    return { result, editor }
  }

  test('has_selection is false when nothing selected and not in select-all', () => {
    const { result } = setup({ selected_count: 0, select_all_mode: false })
    expect(result.has_selection.value).toBe(false)
  })

  test('has_selection is true when select_all_mode is on (even with empty count)', () => {
    const { result } = setup({ selected_count: 0, select_all_mode: true })
    expect(result.has_selection.value).toBe(true)
  })

  test('has_selection is true when selected_count > 0', () => {
    const { result } = setup({ selected_count: 3 })
    expect(result.has_selection.value).toBe(true)
  })

  test('select_all_label says "select-all" when nothing fully selected', () => {
    const { result } = setup({ all_cards_selected: false })
    expect(result.select_all_label.value).toBe('deck-view.bulk-actions.select-all')
  })

  test('select_all_label flips to "deselect-all" when everything is selected', () => {
    const { result } = setup({ all_cards_selected: true })
    expect(result.select_all_label.value).toBe('deck-view.bulk-actions.deselect-all')
  })

  test('onToggleSelectAll emits ui.select and calls selection.toggleSelectAll', () => {
    const { result, editor } = setup()
    result.onToggleSelectAll()
    expect(mockEmitSfx).toHaveBeenCalledWith('select')
    expect(editor.selection.toggleSelectAll).toHaveBeenCalledOnce()
  })

  test('onCancel is wired to actions.onCancelSelection', () => {
    const { result, editor } = setup()
    expect(result.onCancel).toBe(editor.actions.onCancelSelection)
  })

  test('all_cards_selected exposes selection.all_cards_selected', () => {
    const { result } = setup({ all_cards_selected: true })
    expect(result.all_cards_selected.value).toBe(true)
  })
})

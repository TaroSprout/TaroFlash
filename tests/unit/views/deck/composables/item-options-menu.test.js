import { describe, test, expect, vi } from 'vite-plus/test'
import { createApp } from 'vue'
import { config } from '@vue/test-utils'

import { useCardItemOptionsMenu } from '@/views/deck/composables/item-options-menu'
import { cardEditorKey } from '@/views/deck/composables/list-controller'

// ── Helpers ───────────────────────────────────────────────────────────────────

function withSetup(composable, { provide } = {}) {
  let result
  const app = createApp({
    setup() {
      result = composable()
      return () => {}
    }
  })
  for (const plugin of config.global.plugins ?? []) app.use(plugin)
  if (provide) {
    const keys = [...Object.keys(provide), ...Object.getOwnPropertySymbols(provide)]
    for (const k of keys) app.provide(k, provide[k])
  }
  app.mount(document.createElement('div'))
  return [result, app]
}

function makeEditor() {
  return {
    actions: {
      onSelectCard: vi.fn(),
      onMoveCards: vi.fn(),
      onDeleteCards: vi.fn()
    },
    editCard: vi.fn()
  }
}

describe('useCardItemOptionsMenu — options', () => {
  test('exposes exactly select, move, edit, and delete, in that order', () => {
    const editor = makeEditor()
    const [{ options }, app] = withSetup(() => useCardItemOptionsMenu(), {
      provide: { [cardEditorKey]: editor }
    })

    expect(options.value.map((o) => o.value)).toEqual(['select', 'move', 'edit', 'delete'])
    app.unmount()
  })
})

describe('useCardItemOptionsMenu — onSelect dispatch', () => {
  test('select option calls onSelectCard with the card id', () => {
    const editor = makeEditor()
    const [{ onSelect }, app] = withSetup(() => useCardItemOptionsMenu(), {
      provide: { [cardEditorKey]: editor }
    })

    onSelect({ label: 'Select', value: 'select' }, 5)

    expect(editor.actions.onSelectCard).toHaveBeenCalledWith(5)
    expect(editor.actions.onMoveCards).not.toHaveBeenCalled()
    expect(editor.actions.onDeleteCards).not.toHaveBeenCalled()
    app.unmount()
  })

  test('move option calls onMoveCards with the card id', () => {
    const editor = makeEditor()
    const [{ onSelect }, app] = withSetup(() => useCardItemOptionsMenu(), {
      provide: { [cardEditorKey]: editor }
    })

    onSelect({ label: 'Move', value: 'move' }, 5)

    expect(editor.actions.onMoveCards).toHaveBeenCalledWith(5)
    expect(editor.actions.onSelectCard).not.toHaveBeenCalled()
    expect(editor.actions.onDeleteCards).not.toHaveBeenCalled()
    app.unmount()
  })

  test('delete option calls onDeleteCards with the card id', () => {
    const editor = makeEditor()
    const [{ onSelect }, app] = withSetup(() => useCardItemOptionsMenu(), {
      provide: { [cardEditorKey]: editor }
    })

    onSelect({ label: 'Delete', value: 'delete' }, 5)

    expect(editor.actions.onDeleteCards).toHaveBeenCalledWith(5)
    expect(editor.actions.onSelectCard).not.toHaveBeenCalled()
    expect(editor.actions.onMoveCards).not.toHaveBeenCalled()
    app.unmount()
  })

  test('edit option calls editCard with the card id', () => {
    const editor = makeEditor()
    const [{ onSelect }, app] = withSetup(() => useCardItemOptionsMenu(), {
      provide: { [cardEditorKey]: editor }
    })

    onSelect({ label: 'Edit', value: 'edit' }, 5)

    expect(editor.editCard).toHaveBeenCalledWith(5)
    expect(editor.actions.onSelectCard).not.toHaveBeenCalled()
    expect(editor.actions.onMoveCards).not.toHaveBeenCalled()
    expect(editor.actions.onDeleteCards).not.toHaveBeenCalled()
    app.unmount()
  })

  test('an unknown option value is a no-op', () => {
    const editor = makeEditor()
    const [{ onSelect }, app] = withSetup(() => useCardItemOptionsMenu(), {
      provide: { [cardEditorKey]: editor }
    })

    onSelect({ label: 'Unknown', value: 'unknown' }, 5)

    expect(editor.actions.onSelectCard).not.toHaveBeenCalled()
    expect(editor.actions.onMoveCards).not.toHaveBeenCalled()
    expect(editor.actions.onDeleteCards).not.toHaveBeenCalled()
    expect(editor.editCard).not.toHaveBeenCalled()
    app.unmount()
  })
})

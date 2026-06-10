import { computed, ref, type InjectionKey } from 'vue'
import { useLocalRef } from '@/composables/use-local-ref'

export type DeckViewShell = ReturnType<typeof useDeckViewShell>

/** Card render size for the deck grid — Small / Base / Full in the toolbar. */
export type CardGridSize = 'base' | 'md' | 'xl'

export const deckViewShellKey = Symbol('deckViewShell') as InjectionKey<DeckViewShell>

/**
 * UI shell of the deck view: which mode (pane) is active and how the grid
 * renders. Deliberately free of card-data concerns so panes that only switch
 * modes don't have to depend on the whole card-list controller.
 *
 * Mode changes all funnel through here — `setMode` / `toggleMode` / `exitMode`
 * are the single seam for cross-cutting concerns like unsaved-changes guards.
 * The pane/chrome each mode maps to lives in `views/deck/modes.ts`.
 *
 * @example
 * const shell = useDeckViewShell()
 * provide(deckViewShellKey, shell)
 */
export function useDeckViewShell() {
  const mode = ref<CardEditorMode>('view')
  const grid_size = useLocalRef<CardGridSize>('deck-grid-size', 'md')

  const is_view = computed(() => mode.value === 'view')

  /** Switch the deck view to `new_mode`. */
  function setMode(new_mode: CardEditorMode) {
    mode.value = new_mode
  }

  /** Enter `target`, or fall back to the base view when it's already active. */
  function toggleMode(target: CardEditorMode) {
    setMode(mode.value === target ? 'view' : target)
  }

  /** Leave the current mode back to the base view. */
  function exitMode() {
    setMode('view')
  }

  /** Set the card render size for the deck grid (Small / Base / Full). */
  function setGridSize(size: CardGridSize) {
    grid_size.value = size
  }

  return { mode, is_view, grid_size, setMode, toggleMode, exitMode, setGridSize }
}

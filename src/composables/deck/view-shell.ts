import { computed, ref, type InjectionKey } from 'vue'
import { useLocalRef } from '@/composables/storage/local-ref'
import { emitSfx } from '@/sfx/bus'

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

  // Resolvers waiting on the in-flight mode transition; drained by
  // `notifyModeSettled` when the mode-stack reports an entering pane settled.
  const settle_waiters = new Set<() => void>()

  const is_view = computed(() => mode.value === 'view')

  /**
   * Switch the deck view to `new_mode`, resolving once that pane's enter
   * transition has finished animating — the mode-stack calls `notifyModeSettled`
   * from the GSAP completion. Resolves immediately when already in `new_mode`.
   * `mode` still flips synchronously; only the returned promise is deferred, so
   * callers that ignore it are unaffected. Plays the shared mode-switch chime
   * (`ui.select`) on every real switch, so call sites don't each wire their own.
   */
  function setMode(new_mode: CardEditorMode): Promise<void> {
    if (mode.value === new_mode) return Promise.resolve()

    emitSfx('ui.select')

    const settled = new Promise<void>((resolve) => settle_waiters.add(resolve))
    mode.value = new_mode
    return settled
  }

  /**
   * Resolve everyone waiting on the current transition. Called by the
   * mode-stack when an entering pane finishes its GSAP animation.
   */
  function notifyModeSettled() {
    const waiters = [...settle_waiters]
    settle_waiters.clear()
    waiters.forEach((resolve) => resolve())
  }

  /** Enter `target`, or fall back to the base view when it's already active. */
  function toggleMode(target: CardEditorMode) {
    return setMode(mode.value === target ? 'view' : target)
  }

  /** Leave the current mode back to the base view. */
  function exitMode() {
    return setMode('view')
  }

  /** Set the card render size for the deck grid (Small / Base / Full). */
  function setGridSize(size: CardGridSize) {
    grid_size.value = size
  }

  return {
    mode,
    is_view,
    grid_size,
    setMode,
    notifyModeSettled,
    toggleMode,
    exitMode,
    setGridSize
  }
}

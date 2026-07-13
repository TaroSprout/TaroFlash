import { computed, ref, type InjectionKey } from 'vue'
import { useLocalRef } from '@/composables/storage/local-ref'
import { emitSfx } from '@/sfx/bus'

export type DeckViewShell = ReturnType<typeof useDeckViewShell>

/** Card render size for the deck grid — Small / Base / Full in the toolbar. */
export type CardGridSize = 'base' | 'md' | 'xl'

/** How the base grid orders cards. `default` is the deck's own rank order. */
export type CardSortKey = 'default' | 'difficulty'

export const deckViewShellKey = Symbol('deckViewShell') as InjectionKey<DeckViewShell>

/**
 * UI shell of the deck view: which mode (pane) is active and how the grid
 * renders. Deliberately free of card-data concerns so panes that only switch
 * modes don't have to depend on the whole card-list controller.
 *
 * Mode changes all funnel through here — `setMode` / `toggleMode` / `exitMode`
 * are the single seam for cross-cutting concerns like unsaved-changes guards.
 * The pane/chrome each mode maps to lives in `deck/modes.ts`.
 *
 * @example
 * const shell = useDeckViewShell()
 * provide(deckViewShellKey, shell)
 */
export function useDeckViewShell() {
  const mode = ref<CardEditorMode>('view')
  const grid_size = useLocalRef<CardGridSize>('deck-grid-size', 'md')
  const grid_face = useLocalRef<Exclude<CardSide, 'cover'>>('deck-grid-face', 'front')
  const sort_by = ref<CardSortKey>('default')

  // Drag-to-reorder toggle for the base grid. Lives here (not in the card
  // controller) because it's a view-pane interaction state, like `grid_size`.
  const is_rearranging = ref(false)

  // Shared so the same trigger/panel pairing works as a desktop popover
  // (mode-toolbar) or a full mobile-dock swap (mobile-footer).
  const is_page_settings_open = ref(false)

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

    emitSfx('select')

    // Reordering only applies to the base grid; leaving the view drops it.
    if (new_mode !== 'view') is_rearranging.value = false

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

  /** Set which face the deck grid renders by default (front / back). */
  function setGridFace(face: Exclude<CardSide, 'cover'>) {
    grid_face.value = face
  }

  /**
   * Set how the base grid orders cards. A non-default sort reorders the whole
   * deck, which can't coexist with drag-to-reorder, so it drops rearrange mode.
   */
  function setSortBy(key: CardSortKey) {
    if (sort_by.value === key) return
    sort_by.value = key
    if (key !== 'default') is_rearranging.value = false
  }

  /** Flip drag-to-reorder on the base grid; turning it on returns to the view. */
  function toggleRearrange() {
    is_rearranging.value = !is_rearranging.value
    emitSfx(is_rearranging.value ? 'pop_up_pop' : 'pop_up_close')
    if (is_rearranging.value) {
      mode.value = 'view'
      sort_by.value = 'default'
    }
  }

  function openPageSettings() {
    emitSfx('snappy_button_5')
    is_page_settings_open.value = true
  }

  function closePageSettings() {
    emitSfx('snappy_button_5')
    is_page_settings_open.value = false
  }

  return {
    mode,
    is_view,
    grid_size,
    grid_face,
    sort_by,
    is_rearranging,
    is_page_settings_open,
    setMode,
    notifyModeSettled,
    toggleMode,
    exitMode,
    setGridSize,
    setGridFace,
    setSortBy,
    toggleRearrange,
    openPageSettings,
    closePageSettings
  }
}

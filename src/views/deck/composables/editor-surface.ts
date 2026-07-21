import { inject } from 'vue'
import { useMatchMedia } from '@/composables/ui/media-query'
import { cardEditorKey } from './list-controller'
import { deckViewShellKey } from './view-shell'
import { mobileCardEditorKey } from '@/views/deck/mobile-editor/use-mobile-card-editor'

export type EditorSurface = ReturnType<typeof useEditorSurface>

/**
 * Single source of truth for *which* card-editing surface the deck view uses at
 * the current viewport. Below the `md` breakpoint the mobile dock editor is the
 * deck's only editing surface; at md+ it's the desktop mode-stack. Every entry
 * point — empty-state CTA, mobile dock button, edit menu, card tap — routes
 * through here so the breakpoint and the surface choice can never drift apart.
 *
 * @example
 * const surface = useEditorSurface()
 * surface.openNewCard()            // stage + open on the fitting surface
 * if (surface.openCard(id)) return // mobile handled it; desktop falls through
 */
export function useEditorSurface() {
  const editor = inject(cardEditorKey, null)
  const shell = inject(deckViewShellKey, null)
  const mobile_editor = inject(mobileCardEditorKey, null)

  const is_mobile = useMatchMedia('w<md')

  /** Stage a fresh card and open it on the surface that fits the viewport. */
  function openNewCard() {
    if (is_mobile.value) mobile_editor?.openNewCard()
    else editor?.newCard()
  }

  /** Enter editing: the dock editor below md, desktop edit mode at md+. */
  function startEditing() {
    if (is_mobile.value) mobile_editor?.open_at()
    else shell?.toggleMode('edit')
  }

  /**
   * Open an existing card. Below md this routes to the dock editor and returns
   * `true`; at md+ it returns `false` so the caller keeps its in-place behaviour
   * (e.g. flip the card).
   */
  function openCard(client_id: string): boolean {
    if (!is_mobile.value) return false

    mobile_editor?.open_at(client_id)
    return true
  }

  return { is_mobile, openNewCard, startEditing, openCard }
}

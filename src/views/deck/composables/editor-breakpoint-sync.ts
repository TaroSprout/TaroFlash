import { watch } from 'vue'
import { useEditorSurface } from './editor-surface'
import type { CardListController } from './list-controller'
import type { DeckViewShell } from './view-shell'
import type { MobileCardEditor } from '../mobile-editor/use-mobile-card-editor'

/**
 * Keep the active card-editing surface aligned with the viewport. Desktop edit
 * mode and the mobile dock editor are two faces of one intent, picked once at
 * open time; resizing across the `md` breakpoint would otherwise strand the user
 * in the surface that no longer fits. On each cross this tears down the current
 * surface and opens the other on the same card. The unsaved staged card is a
 * temp already living in `all_cards`, so it survives the swap either way.
 *
 * @param shell - The deck-view shell; owns desktop `mode`.
 * @param editor - The card-list controller; its `pending_focus_client_id` queues
 *   a desktop row for autofocus so grow lands on the right card.
 * @param mobile_editor - The mobile dock editor; the cursor into `all_cards`.
 */
export function useEditorBreakpointSync(
  shell: DeckViewShell,
  editor: CardListController,
  mobile_editor: MobileCardEditor
) {
  // Share the deck view's one definition of the mobile-editor breakpoint so the
  // resize reaction can't drift from the entry points that route to each surface.
  const { is_mobile } = useEditorSurface()

  // Which desktop editor row currently holds DOM focus. Desktop edit tracks no
  // "current card" of its own, so focus is the only signal for which card the
  // user is on when the viewport shrinks out from under them.
  function focusedDesktopClientId(): string | undefined {
    const row = document.activeElement?.closest('[data-testid="list-item-card"]')
    return (row as HTMLElement | null)?.dataset.clientId
  }

  // Desktop edit → mobile dock editor. Land on the focused card, falling back to
  // a just-staged card awaiting focus, then to the first card (`open_at`'s
  // default). No-op unless the desktop editor is actually open.
  function shrinkToMobile() {
    if (shell.mode.value !== 'edit') return

    const target = focusedDesktopClientId() ?? editor.pending_focus_client_id.value ?? undefined
    shell.exitMode()
    mobile_editor.open_at(target)
  }

  // Mobile dock editor → desktop edit. Enter edit mode with the cursor's card
  // queued for autofocus, so the desktop list lands on and reveals the same card.
  function growToDesktop() {
    if (!mobile_editor.is_open.value) return

    editor.pending_focus_client_id.value = mobile_editor.current.value?.client_id ?? null
    mobile_editor.close()
    shell.setMode('edit')
  }

  watch(is_mobile, (mobile) => (mobile ? shrinkToMobile() : growToDesktop()))
}

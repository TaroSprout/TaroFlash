import PendingDeletionModal from '@/components/member/pending-deletion-modal.vue'
import { useModal, type OpenModalResult } from '@/composables/modal'

// Module-level so repeat opens collapse onto the one dialog. The router guard
// opens this on every diverted navigation, and a pending member can trigger
// several in a row — a cold load on a deck URL diverts to welcome, then
// welcome's own mount pushes back into the shell and diverts again. Without
// this the stack would grow a duplicate dialog per divert.
let current: OpenModalResult<void> | null = null

/**
 * Opens the pending-deletion dialog over whatever is on screen. Called from the
 * router guard rather than a view: the divert to welcome is often a same-route
 * navigation, so welcome never remounts and an `onMounted` trigger would miss.
 */
export function usePendingDeletionModal() {
  const modal = useModal()

  function open(): OpenModalResult<void> {
    if (current) return current

    current = modal.open<void>(PendingDeletionModal, {
      backdrop: true,
      mode: 'popup'
    })

    current.response.then(() => (current = null))

    return current
  }

  return { open }
}

import { useI18n } from 'vue-i18n'
import { useAlert } from '@/composables/alert'
import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'
import MoveCardsModal from '@/components/card/move-cards-modal.vue'

/**
 * Shared UI prompts for destructive card actions — the confirm-delete alert
 * and the move-cards modal — so every card-action call site (deck editor,
 * study session) opens identical dialogs with the same copy and sfx. Callers
 * own where the card set comes from and what happens after; this only owns the
 * prompt.
 */
export function useCardPrompts() {
  const { t } = useI18n()
  const alert = useAlert()
  const modal = useModal()

  /** Show the delete-N-cards confirm alert. Resolves to the user's choice. */
  function confirmDelete(count: number) {
    const { response } = alert.warn({
      title: t('alert.delete-card.title', { count }),
      message: t('alert.delete-card.message', { count }),
      confirmLabel: t('alert.delete-card.confirm'),
      confirmAudio: 'trash_crumple_short'
    })
    return response
  }

  /**
   * Open the move-cards modal for `cards`, paired with the open / close sfx.
   * `move` runs the actual mutation once a deck is picked — the modal shows
   * its own loading state while it awaits and stays open if it throws.
   * Resolves to the chosen destination deck, or `undefined` if dismissed.
   */
  function openMoveModal(
    cards: Card[],
    count: number,
    current_deck_id: number,
    move: (deck_id: number) => Promise<void>
  ) {
    emitSfx('double_pop_up')

    const { response } = modal.open<{ deck_id: number }>(MoveCardsModal, {
      backdrop: true,
      mode: 'popup',
      props: { cards, count, current_deck_id, move }
    })
    response.then(() => emitSfx('double_pop_down'))

    return response
  }

  return { confirmDelete, openMoveModal }
}

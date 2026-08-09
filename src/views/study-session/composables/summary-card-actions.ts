import { useI18n } from 'vue-i18n'
import { useCardMutations, useCardPrompts } from '@/composables/card'
import { useNoticeStore } from '@/stores/notice-store'
import type { StudyCard } from './session-engine'

type UseSummaryCardActionsOptions = {
  onRemoved: (card_id: number) => void
}

/**
 * Destructive intent handlers for one or many session-summary cards: delete
 * and move to another deck. A summary selection can span several decks, so —
 * unlike the single active-card `useActiveCardActions` — every call resolves
 * each card's own `deck_id` instead of taking one deck id from the caller.
 * Reuses the same shared prompts / write seam so the dialogs and copy match.
 */
export function useSummaryCardActions({ onRemoved }: UseSummaryCardActionsOptions) {
  const { t } = useI18n()
  const notice = useNoticeStore()
  const { confirmDelete, openMoveModal } = useCardPrompts()
  const mutations = useCardMutations(() => undefined)

  /** Confirm + delete `target`, then drop each from the session. */
  async function deleteCards(target: StudyCard[]) {
    if (target.length === 0) return
    if (!(await confirmDelete(target.length))) return

    try {
      await mutations.deleteCards({ cards: target })
    } catch {
      notice.error(t('toast.error.delete-cards-failed'))
      return
    }
    target.forEach((card) => onRemoved(card.id))
  }

  /**
   * Open the move-cards modal for `target`. Only cards that actually leave
   * their deck are dropped from the session afterwards — one already sitting
   * in the chosen target deck is left exactly as it was (the RPC treats it as
   * a no-op, not a move).
   */
  async function moveCards(target: StudyCard[]) {
    if (target.length === 0) return

    const source_deck_ids = [
      ...new Set(target.map((card) => card.deck_id).filter((id): id is number => id !== undefined))
    ]
    // A mixed-deck selection has no single "current" deck to disable in the picker.
    const current_deck_id = source_deck_ids.length === 1 ? source_deck_ids[0] : undefined

    async function move(target_deck_id: number) {
      await mutations.moveCards({
        target_deck_id,
        card_ids: target.map((card) => card.id),
        source_deck_ids
      })
    }

    const result = await openMoveModal(target, target.length, current_deck_id, move)
    if (!result) return

    target.filter((card) => card.deck_id !== result.deck_id).forEach((card) => onRemoved(card.id))
  }

  return { deleteCards, moveCards }
}

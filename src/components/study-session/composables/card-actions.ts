import { type MaybeRefOrGetter, type Ref, toValue } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCardMutations, useCardPrompts } from '@/composables/card'
import { useNoticeStore } from '@/stores/notice-store'
import type { StudyCard } from './session-core'

type UseActiveCardActionsOptions = {
  active_card: Ref<StudyCard | undefined>
  deck_id: MaybeRefOrGetter<number | undefined>
  onRemoved: (card_id: number) => void
}

/**
 * Destructive intent handlers for the active study card: delete and move to
 * another deck. Reuses the card domain's shared prompts (`useCardPrompts`) and
 * write seam (`useCardMutations`), then calls `onRemoved` so the session queue
 * drops the card and advances.
 *
 * @example
 * const { onDelete, onMove } = useActiveCardActions({
 *   active_card,
 *   deck_id: () => deck.id,
 *   onRemoved: dropCard
 * })
 */
export function useActiveCardActions({
  active_card,
  deck_id,
  onRemoved
}: UseActiveCardActionsOptions) {
  const { t } = useI18n()
  const notice = useNoticeStore()
  const { confirmDelete, openMoveModal } = useCardPrompts()
  const mutations = useCardMutations(deck_id)

  /** Confirm + delete the active card, then drop it from the session. */
  async function onDelete() {
    const card = active_card.value
    if (!card) return
    if (!(await confirmDelete(1))) return

    try {
      await mutations.deleteCards({ cards: [card] })
    } catch {
      notice.error(t('toast.error.delete-cards-failed'))
      return
    }
    onRemoved(card.id)
  }

  /** Open the move-cards modal for the active card; on confirm, move + drop it. */
  async function onMove() {
    const card = active_card.value
    if (!card) return

    async function move(target_deck_id: number) {
      await mutations.moveCards({
        target_deck_id,
        card_ids: [card!.id],
        source_deck_ids: [toValue(deck_id)!]
      })
    }

    const target = await openMoveModal([card], 1, toValue(deck_id)!, move)
    if (!target) return

    onRemoved(card.id)
  }

  return { onDelete, onMove }
}

import { ref, watch, type MaybeRefOrGetter, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCardMutations } from '@/composables/card'
import { useNoticeStore } from '@/stores/notice-store'
import type { StudyCard } from './session-queue'

/**
 * Owns the editing/saving UI state for the active study card. Card writes go
 * through the card domain's `useCardMutations` seam so the FSRS queue and
 * rendered card stay in sync without a second persistence path. The saved
 * text is also patched into the session's own card copy via `updateCard` —
 * the query-cache patch from `useCardMutations` only touches the deck-list
 * cache, which the session doesn't read from once seeded.
 *
 * @param deck_id - Reactive id of the deck under study, forwarded to the seam.
 */
export function useCardEdit(
  active_card: Ref<StudyCard | undefined>,
  deck_id: MaybeRefOrGetter<number | undefined>,
  updateCard: (card_id: number, values: Partial<Card>) => void
) {
  const { t } = useI18n()
  const notice = useNoticeStore()
  const editing = ref(false)
  const saving = ref(false)
  const mutations = useCardMutations(deck_id)

  watch(
    () => active_card.value?.id,
    () => {
      editing.value = false
    }
  )

  function start() {
    if (!active_card.value) return
    editing.value = true
  }

  function stop() {
    editing.value = false
  }

  async function update(side: 'front' | 'back', text: string) {
    const card = active_card.value
    if (!card?.id) return
    saving.value = true
    const values = { [`${side}_text`]: text }
    try {
      await mutations.saveCard(card, values)
      updateCard(card.id, values)
    } catch {
      notice.error(t('toast.error.card-save-failed'))
    } finally {
      saving.value = false
    }
  }

  return { editing, saving, start, stop, update }
}

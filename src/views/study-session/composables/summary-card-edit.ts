import { computed, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCardMutations } from '@/composables/card'
import { useNoticeStore } from '@/stores/notice-store'
import type { StudyCard } from './session-engine'

/**
 * Editing/saving UI state for an arbitrary session-summary card, addressed by
 * id rather than "the active card" — a category page can open any of its
 * cards, not just the one currently under study. Sibling to `useCardEdit`
 * (the active-card editor): same write seam and session-copy patch, but no
 * auto-close watch — there's no "card advancing" concept here, so editing
 * only ever ends via an explicit `stop()`.
 */
export function useSummaryCardEdit(
  cards: Ref<StudyCard[]>,
  updateCard: (card_id: number, values: Partial<Card>) => void
) {
  const { t } = useI18n()
  const notice = useNoticeStore()
  const editing_card_id = ref<number | null>(null)
  const saving = ref(false)

  const editing_card = computed(() => cards.value.find((c) => c.id === editing_card_id.value))

  const mutations = useCardMutations(() => editing_card.value?.deck_id)

  function start(card_id: number) {
    editing_card_id.value = card_id
  }

  function stop() {
    editing_card_id.value = null
  }

  async function update(side: 'front' | 'back', text: string) {
    const card = editing_card.value
    if (!card) return
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

  return { editing_card_id, editing_card, saving, start, stop, update }
}

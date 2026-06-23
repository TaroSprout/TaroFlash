import { ref, watch, type MaybeRefOrGetter, type Ref } from 'vue'
import { useCardMutations } from '@/composables/card'
import type { StudyCard } from './session-core'

/**
 * Owns the editing/saving UI state for the active study card. Card writes go
 * through the card domain's `useCardMutations` seam so the FSRS queue and
 * rendered card stay in sync without a second persistence path.
 *
 * @param deck_id - Reactive id of the deck under study, forwarded to the seam.
 */
export function useCardEdit(
  active_card: Ref<StudyCard | undefined>,
  deck_id: MaybeRefOrGetter<number | undefined>
) {
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
    if (!card) return
    saving.value = true
    await mutations.saveCard(card, { [`${side}_text`]: text })
    saving.value = false
  }

  return { editing, saving, start, stop, update }
}

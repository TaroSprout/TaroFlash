import { ref, watch, type Ref } from 'vue'
import { useSaveCardMutation } from '@/api/cards'
import type { StudyCard } from './session-core'

/**
 * Owns the editing/saving state for the active study card. Mutates the card
 * in place via the debounced save mutation so the FSRS queue and rendered
 * card stay in sync without a second data path.
 */
export function useCardEdit(active_card: Ref<StudyCard | undefined>) {
  const editing = ref(false)
  const saving = ref(false)
  const save_mutation = useSaveCardMutation()

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
    await save_mutation.mutateAsync({ card, values: { [`${side}_text`]: text } })
    saving.value = false
  }

  return { editing, saving, start, stop, update }
}

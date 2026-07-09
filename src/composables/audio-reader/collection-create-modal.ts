import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'
import CollectionCreate, {
  type CollectionCreateResponse
} from '@/views/audio-reader/collection-create-modal.vue'

/**
 * Open the create-collection modal. Resolves to the created LessonCollection,
 * or undefined if cancelled.
 */
export function useCollectionCreateModal() {
  const modal = useModal()

  function open() {
    emitSfx('snappy_button_3')
    const result = modal.open<CollectionCreateResponse>(CollectionCreate, {
      backdrop: true,
      mode: 'mobile-sheet'
    })
    result.response.then(() => emitSfx('pop_up_close'))
    return result
  }

  return { open }
}

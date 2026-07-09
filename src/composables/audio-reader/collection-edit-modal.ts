import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'
import CollectionEdit, {
  type CollectionEditResponse
} from '@/views/audio-reader/collection-edit-modal.vue'

/**
 * Open the edit-collection modal (manage a collection's chapters + danger zone)
 * for `collection_id`. Resolves when the modal closes.
 */
export function useCollectionEditModal() {
  const modal = useModal()

  function open(collection_id: number) {
    emitSfx('snappy_button_3')
    const result = modal.open<CollectionEditResponse>(CollectionEdit, {
      props: { collection_id },
      backdrop: true,
      mode: 'mobile-sheet'
    })
    result.response.then(() => emitSfx('pop_up_close'))
    return result
  }

  return { open }
}

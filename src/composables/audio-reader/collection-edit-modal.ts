import { useOverlay } from '@/composables/overlay/use-overlay'
import CollectionEdit, {
  type CollectionEditResponse
} from '@/views/audio-reader/collection-edit-modal.vue'

/**
 * Open the edit-collection modal (manage a collection's chapters + danger zone)
 * for `collection_id`. Resolves when the modal closes.
 */
export function useCollectionEditModal() {
  const { open } = useOverlay()

  function open_collection_edit(collection_id: number) {
    return open<CollectionEditResponse>(CollectionEdit, {
      props: { collection_id },
      presentation: 'dialog',
      open_sfx: 'snappy_button_3',
      close_sfx: 'pop_up_close'
    })
  }

  return { open: open_collection_edit }
}

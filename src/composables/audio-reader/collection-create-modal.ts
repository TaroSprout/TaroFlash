import { useOverlay } from '@/composables/overlay/use-overlay'
import CollectionCreate, {
  type CollectionCreateResponse
} from '@/views/audio-reader/collection-create-modal.vue'

/**
 * Open the create-collection modal. Resolves to the created LessonCollection,
 * or undefined if cancelled.
 */
export function useCollectionCreateModal() {
  const { open } = useOverlay()

  function open_collection_create() {
    return open<CollectionCreateResponse>(CollectionCreate, {
      presentation: 'dialog',
      open_sfx: 'dialog.open',
      close_sfx: 'dialog.close'
    })
  }

  return { open: open_collection_create }
}

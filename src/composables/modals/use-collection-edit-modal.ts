import { defineAsyncComponent } from 'vue'
import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'
import type { CollectionEditResponse } from '@/components/modals/collection-edit/index.vue'

const CollectionEdit = defineAsyncComponent(
  () => import('@/components/modals/collection-edit/index.vue')
)

/**
 * Open the edit-collection modal (manage a collection's chapters + danger zone)
 * for `collection_id`. Resolves when the modal closes.
 */
export function useCollectionEditModal() {
  const modal = useModal()

  function open(collection_id: number) {
    emitSfx('ui.alert_clicks_wooden')
    const result = modal.open<CollectionEditResponse>(CollectionEdit, {
      props: { collection_id },
      backdrop: true,
      mode: 'mobile-sheet'
    })
    result.response.then(() => emitSfx('ui.pop_up_close'))
    return result
  }

  return { open }
}

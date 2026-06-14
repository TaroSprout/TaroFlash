import { defineAsyncComponent } from 'vue'
import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'
import type { CollectionCreateResponse } from '@/components/modals/collection-create/index.vue'

const CollectionCreate = defineAsyncComponent(
  () => import('@/components/modals/collection-create/index.vue')
)

/**
 * Open the create-collection modal. Resolves to the created LessonCollection,
 * or undefined if cancelled.
 */
export function useCollectionCreateModal() {
  const modal = useModal()

  function open() {
    emitSfx('ui.snappy_button_3')
    const result = modal.open<CollectionCreateResponse>(CollectionCreate, {
      backdrop: true,
      mode: 'mobile-sheet'
    })
    result.response.then(() => emitSfx('ui.pop_up_close'))
    return result
  }

  return { open }
}

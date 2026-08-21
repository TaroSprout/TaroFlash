import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'
import AdminComponent from '@/views/admin/index.vue'

/** Opens the Admin Tools modal. Shared by the phone launcher and any other entry point. */
export function useAdminModal() {
  const modal = useModal()

  function open() {
    emitSfx('dialog.open')

    const result = modal.open(AdminComponent, {
      backdrop: true,
      mode: 'mobile-sheet',
      mobile_below_width: 'mlg',
      mobile_below_height: 'md'
    })

    result.response.then(() => emitSfx('dialog.close'))

    return result
  }

  return { open }
}

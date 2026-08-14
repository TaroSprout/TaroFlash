import { useModal } from '@/composables/modal'
import AdminComponent from '@/views/admin/index.vue'

/** Opens the Admin Tools modal. Shared by the phone launcher and any other entry point. */
export function useAdminModal() {
  const modal = useModal()

  function open() {
    return modal.open(AdminComponent, {
      backdrop: true,
      mode: 'mobile-sheet',
      mobile_below_width: 'mlg',
      mobile_below_height: 'md'
    })
  }

  return { open }
}

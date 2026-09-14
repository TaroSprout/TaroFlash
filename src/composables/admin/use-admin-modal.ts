import { useOverlay } from '@/composables/overlay/use-overlay'
import AdminComponent from '@/views/admin/index.vue'

/** Opens the Admin Tools modal. Shared by the phone launcher and any other entry point. */
export function useAdminModal() {
  const { open } = useOverlay()

  function open_admin() {
    return open(AdminComponent, {
      presentation: 'dialog',
      open_sfx: 'dialog.open',
      close_sfx: 'dialog.close'
    })
  }

  return { open: open_admin }
}

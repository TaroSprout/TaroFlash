import { defineAsyncComponent } from 'vue'
import { useModal } from '@/composables/modal'

const ResetPasswordModal = defineAsyncComponent(() => import('./index.vue'))

/** Opens the post-recovery reset-password modal. */
export function useResetPasswordModal() {
  const modal = useModal()

  function open() {
    return modal.open<boolean>(ResetPasswordModal, { backdrop: true, mode: 'popup' })
  }

  return { open }
}

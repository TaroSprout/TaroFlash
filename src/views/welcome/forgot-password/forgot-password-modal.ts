import { useModal } from '@/composables/modal'
import ForgotPasswordModal from './index.vue'

/** Opens the forgot-password request modal. */
export function useForgotPasswordModal() {
  const modal = useModal()

  function open() {
    return modal.open<boolean>(ForgotPasswordModal, { backdrop: true, mode: 'popup' })
  }

  return { open }
}

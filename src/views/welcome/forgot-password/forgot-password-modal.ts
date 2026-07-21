import { useOverlay } from '@/composables/overlay/use-overlay'
import ForgotPasswordModal from './index.vue'

/** Opens the forgot-password request modal. */
export function useForgotPasswordModal() {
  const { open } = useOverlay()

  function open_forgot_password() {
    return open<boolean>(ForgotPasswordModal, { presentation: 'popup' })
  }

  return { open: open_forgot_password }
}

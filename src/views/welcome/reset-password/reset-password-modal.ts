import { useOverlay } from '@/composables/overlay/use-overlay'
import ResetPasswordModal from './index.vue'

/** Opens the post-recovery reset-password modal. */
export function useResetPasswordModal() {
  const { open } = useOverlay()

  function open_reset_password() {
    return open<boolean>(ResetPasswordModal, { presentation: 'popup' })
  }

  return { open: open_reset_password }
}

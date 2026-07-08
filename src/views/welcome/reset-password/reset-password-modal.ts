import { useModal } from '@/composables/modal'
import ResetPasswordModal from './index.vue'

/** Opens the post-recovery reset-password modal. */
export function useResetPasswordModal() {
  const modal = useModal()

  function open() {
    return modal.open<boolean>(ResetPasswordModal, { backdrop: true, mode: 'popup' })
  }

  return { open }
}

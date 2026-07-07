import { defineAsyncComponent } from 'vue'
import { useModal } from '@/composables/modal'

const ForgotPasswordModal = defineAsyncComponent(() => import('./index.vue'))

/** Opens the forgot-password request modal. */
export function useForgotPasswordModal() {
  const modal = useModal()

  function open() {
    return modal.open<boolean>(ForgotPasswordModal, { backdrop: true, mode: 'popup' })
  }

  return { open }
}

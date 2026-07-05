import { useModal } from '@/composables/modal'
import AccountAccessModal from '@/components/settings/account-access/index.vue'

/** Opens the email/password/Google account-access modal from the settings aside. */
export function useAccountAccessModal() {
  const modal = useModal()

  function open() {
    return modal.open(AccountAccessModal, { backdrop: true, mode: 'popup' })
  }

  return { open }
}

import { useOverlay } from '@/composables/overlay/use-overlay'
import AccountAccessModal from '@/views/settings/account-access/index.vue'

/** Opens the email/password/Google account-access modal from the settings aside. */
export function useAccountAccessModal() {
  const { open } = useOverlay()

  function open_account_access() {
    return open(AccountAccessModal, { presentation: 'popup' })
  }

  return { open: open_account_access }
}

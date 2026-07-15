import { useAccountAccessModal } from '@/composables/settings/use-account-access-modal'

/** Opens the account-access modal. */
export function useAccountAccessClick() {
  const account_access_modal = useAccountAccessModal()

  async function onAccountAccessClick() {
    await account_access_modal.open().response
  }

  return { onAccountAccessClick }
}

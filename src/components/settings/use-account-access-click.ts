import { inject } from 'vue'
import { useAccountAccessModal } from '@/composables/settings/use-account-access-modal'
import { settingsRecedeKey } from './layout'

/** Wraps opening the account-access modal with the settings-modal recede/restore choreography. */
export function useAccountAccessClick() {
  const recede = inject(settingsRecedeKey)
  const account_access_modal = useAccountAccessModal()

  async function onAccountAccessClick() {
    recede?.recede()
    await account_access_modal.open().response
    recede?.restore()
  }

  return { onAccountAccessClick }
}

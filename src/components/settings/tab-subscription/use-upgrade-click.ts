import { inject } from 'vue'
import { useSubscriptionActions } from '@/composables/member/subscription-actions'
import { settingsRecedeKey } from '../layout'

/** Wraps `onUpgrade` with the settings-modal recede/restore choreography. */
export function useUpgradeClick() {
  const recede = inject(settingsRecedeKey)
  const actions = useSubscriptionActions()

  async function onUpgradeClick() {
    recede?.recede()
    await actions.onUpgrade()
    recede?.restore()
  }

  return { ...actions, onUpgradeClick }
}

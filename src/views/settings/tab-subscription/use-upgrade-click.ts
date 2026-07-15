import { useSubscriptionActions } from '@/composables/member/subscription-actions'

/** Opens the upgrade flow. */
export function useUpgradeClick() {
  const actions = useSubscriptionActions()

  async function onUpgradeClick() {
    await actions.onUpgrade()
  }

  return { ...actions, onUpgradeClick }
}

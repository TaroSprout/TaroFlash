import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@/stores/session'
import { useToast } from '@/composables/toast'

/** Revokes every session for this member except the current one. */
export function useSignOutOthers() {
  const session = useSessionStore()
  const { t } = useI18n()
  const toast = useToast()

  const loading = ref(false)

  async function onSignOutOthers() {
    loading.value = true
    try {
      await session.signOutOtherDevices()
      toast.success(t('account-access-modal.sign-out-others.success'))
    } catch {
      toast.error(t('account-access-modal.sign-out-others.error'))
    }
    loading.value = false
  }

  return { loading, onSignOutOthers }
}

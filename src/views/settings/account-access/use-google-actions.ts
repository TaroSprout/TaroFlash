import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@/stores/session'
import { useAlert } from '@/composables/alert'
import { useNoticeStore } from '@/stores/notice-store'

/**
 * Connect/disconnect actions for the account-access modal's Google row.
 * Disconnect is gated on the member having a password identity — Supabase
 * refuses to unlink a user's last remaining identity, so we prevent the
 * confirm-alert entirely rather than let the call fail.
 */
export function useGoogleActions() {
  const session = useSessionStore()
  const { t } = useI18n()
  const alert = useAlert()
  const notice = useNoticeStore()

  const loading = ref(false)

  async function onConnect() {
    loading.value = true
    try {
      await session.linkGoogleIdentity()
    } catch {
      notice.error(t('account-access-modal.google.connect-error'), { variant: 'panel' })
    }
    loading.value = false
  }

  async function onDisconnect() {
    const { response } = alert.warn({
      title: t('account-access-modal.google.disconnect-alert.title'),
      message: t('account-access-modal.google.disconnect-alert.message'),
      confirmLabel: t('account-access-modal.google.disconnect-alert.confirm'),
      cancelLabel: t('account-access-modal.google.disconnect-alert.cancel')
    })
    if (!(await response)) return

    loading.value = true
    try {
      await session.unlinkGoogleIdentity()
    } catch {
      notice.error(t('account-access-modal.google.disconnect-error'), { variant: 'panel' })
    }
    loading.value = false
  }

  return {
    loading,
    // computed(), not a bare boolean — an unwrapped read here would freeze at composable-call time and never update again.
    hasGoogleIdentity: computed(() => session.hasGoogleIdentity),
    hasPasswordIdentity: computed(() => session.hasPasswordIdentity),
    onConnect,
    onDisconnect
  }
}

import { ref, type InjectionKey, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAlert } from '@/composables/alert'
import { useNoticeStore } from '@/stores/notice-store'
import { useSessionStore } from '@/stores/session'
import { requestAccountDeletion } from '@/api/session'

export type MemberDangerActions = {
  onDeleteAccount: () => Promise<void>
  deleting_account: Ref<boolean>
}

export const memberDangerActionsKey = Symbol(
  'memberDangerActions'
) as InjectionKey<MemberDangerActions>

/**
 * Destructive member actions. Currently a single action: delete account.
 * Wires the confirm-alert + toast feedback used by the danger-zone tab and
 * the mobile index.
 *
 * Created once at the settings root and provided via `memberDangerActionsKey`
 * so any tab can call the same handler without re-wiring emit chains.
 */
export function useMemberDangerActions(close: () => void): MemberDangerActions {
  const { t } = useI18n()
  const alert = useAlert()
  const notice = useNoticeStore()
  const router = useRouter()
  const session = useSessionStore()

  const deleting_account = ref(false)

  async function onDeleteAccount() {
    const confirmed = await alert.warn({
      title: t('alert.delete-account.title'),
      message: t('alert.delete-account.message'),
      confirmLabel: t('alert.delete-account.confirm'),
      confirmAudio: 'trash_crumple_short'
    }).response
    if (!confirmed) return

    deleting_account.value = true

    try {
      await requestAccountDeletion()
    } catch {
      // Nothing partial to undo: the endpoint marks the account before touching
      // Stripe, so a failure here means the account is still fully live.
      notice.error(t('toast.error.account-delete-failed'))
      return
    } finally {
      deleting_account.value = false
    }

    // The endpoint already revoked every session, so this is local teardown
    // only — reset() clears the query cache so no stale rows outlive the account.
    session.reset()

    notice.success(t('toast.success.account-deleted'), {
      variant: 'panel',
      closable: false,
      actions: [{ label: t('notice.close-label'), onClick: () => {}, closesOnClick: true }],
      onDismiss: () => {
        close()
        router.push({ name: 'welcome' })
      }
    })
  }

  return {
    onDeleteAccount,
    deleting_account
  }
}

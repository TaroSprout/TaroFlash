import { ref, type InjectionKey, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAlert } from '@/composables/alert'
import { useToast } from '@/composables/toast'

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
 * the mobile index. The handler is stubbed pending the backend cascade —
 * the alert + toast fire, but no rows are removed.
 *
 * Created once at the settings root and provided via `memberDangerActionsKey`
 * so any tab can call the same handler without re-wiring emit chains.
 */
export function useMemberDangerActions(close: () => void): MemberDangerActions {
  const { t } = useI18n()
  const alert = useAlert()
  const toast = useToast()
  const router = useRouter()

  const deleting_account = ref(false)

  async function onDeleteAccount() {
    const confirmed = await alert.warn({
      title: t('alert.delete-account.title'),
      message: t('alert.delete-account.message'),
      confirmLabel: t('alert.delete-account.confirm'),
      confirmAudio: 'ui.trash_crumple_short'
    }).response
    if (!confirmed) return

    deleting_account.value = true
    try {
      // TODO wire to BE: cascade member rows + auth.users removal via edge function.
      toast.success(t('toast.success.account-deleted'))
      close()
      router.push({ name: 'welcome' })
    } finally {
      deleting_account.value = false
    }
  }

  return {
    onDeleteAccount,
    deleting_account
  }
}

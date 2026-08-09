import { useQueryCache } from '@pinia/colada'
import router from '@/router'
import { currentLocale, t } from '@/i18n'
import { restoreAccount } from '@/api/session'
import { useMemberStore } from '@/stores/member'
import { useSessionStore } from '@/stores/session'
import { useNoticeStore, type Notice } from '@/stores/notice-store'
import logger from '@/utils/logger'

// Module-level so repeat opens collapse onto the one panel. →[K:pending-deletion-notice-singleton]
let current: Notice | null = null

/**
 * The panel a suspended (pending-deletion) member sees over the route skeleton.
 * The checkpoint admits them to the shell rather than diverting to welcome; the
 * shell reacts to `member.pending_deletion` and opens this.
 *
 * Called from a watcher, not component setup, so `t`/`router` come from the
 * module-level i18n and router instances rather than `useI18n()`/`useRouter()`.
 */
export function usePendingDeletionNotice() {
  const member = useMemberStore()
  const session = useSessionStore()
  const notice = useNoticeStore()
  const queryCache = useQueryCache()

  function deleteDate(): string {
    if (!member.delete_at) return ''

    return new Date(member.delete_at).toLocaleDateString(currentLocale(), {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  function dismiss(): void {
    if (!current) return

    notice.removeNotice(current)
    current = null
  }

  async function onRecover(): Promise<void> {
    try {
      await restoreAccount()
    } catch (e) {
      logger.error(`Restore failed: ${(e as Error).message}`)
      notice.error(t('toast.error.account-restore-failed'))
      return
    }

    // →[K:pending-deletion-notice-invalidate-not-remove]
    await queryCache.invalidateQueries()

    dismiss()
    notice.success(t('toast.success.account-restored'))
    router.push({ name: 'dashboard' })
  }

  function open(): void {
    if (current) return

    current = notice.warn(t('pending-deletion-notice.heading'), {
      subMessage: t('pending-deletion-notice.message', { date: deleteDate() }),
      variant: 'panel',
      persist: true,
      closable: false,
      actions: [
        { label: t('pending-deletion-notice.recover-button'), onClick: onRecover },
        {
          label: t('pending-deletion-notice.sign-out-button'),
          onClick: () => session.logout(),
          closesOnClick: true
        }
      ],
      // →[K:pending-deletion-notice-dismiss-signs-out]
      onDismiss: () => {
        current = null
        if (member.pending_deletion) session.logout()
      }
    })
  }

  return { open }
}

import { useQueryCache } from '@pinia/colada'
import router from '@/router'
import { currentLocale, t } from '@/i18n'
import { restoreAccount } from '@/api/session'
import { useMemberStore } from '@/stores/member'
import { useSessionStore } from '@/stores/session'
import { useNoticeStore, type Notice } from '@/stores/notice-store'
import logger from '@/utils/logger'

// Module-level so repeat opens collapse onto the one panel. The shell watches
// `member.pending_deletion` and can call this more than once — an immediate
// fire plus the re-fire when the member row resolves the pending state — and a
// restore-then-relapse would too. The store already allows only one panel at a
// time, but without this each call would replace the panel and replay its open
// sound.
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

    // While archived, every member-owned query resolved to an empty result and
    // cached it. Those entries are all wrong now, and there's no per-key
    // invalidation worth enumerating when the answer is "everything the member
    // owns just came back" — so invalidate the lot.
    //
    // Invalidate, never remove: the member store's query is mounted at the app
    // root and bound to its cache entry. Removing that entry leaves the store
    // reading the old row, `pending_deletion` stays true, and the guard below
    // bounces straight back here. Awaited so the guard reads the refetched row
    // rather than racing it.
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
      // Also covers the swipe-to-dismiss the panel allows regardless of
      // `closable`. Signing out is the only safe landing: an archived member
      // reads zero rows everywhere, so leaving them in the shell with a live
      // session strands them on an empty skeleton with no route back to this
      // panel.
      onDismiss: () => {
        current = null
        if (member.pending_deletion) session.logout()
      }
    })
  }

  return { open }
}

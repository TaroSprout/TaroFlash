import { useQueryCache } from '@pinia/colada'
import router from '@/router'
import { currentLocale, t } from '@/i18n'
import { restoreAccount } from '@/api/session'
import { useMemberStore } from '@/stores/member'
import { useSessionStore } from '@/stores/session'
import { useNoticeStore, type Notice } from '@/stores/notice-store'
import logger from '@/utils/logger'

// Module-level so repeat opens collapse onto the one panel. The router guard
// opens this on every diverted navigation, and a pending member can trigger
// several in a row — a cold load on a deck URL diverts to welcome, then
// welcome's own mount pushes back into the shell and diverts again. The store
// already allows only one panel at a time, but without this each divert would
// replace the panel and replay its open sound.
let current: Notice | null = null

/**
 * The panel a member lands on while their account is archived. Opened from the
 * router guard rather than a view: the divert to welcome is often a same-route
 * navigation, so welcome never remounts and an `onMounted` trigger would miss.
 *
 * Guard-time means no component, hence `t` from the i18n instance rather than
 * `useI18n()`.
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
      // reads zero rows everywhere, so leaving them on welcome with a live
      // session strands them with no route back to this panel.
      onDismiss: () => {
        current = null
        if (member.pending_deletion) session.logout()
      }
    })
  }

  return { open }
}

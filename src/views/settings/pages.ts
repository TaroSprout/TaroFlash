export type PageValue = 'profile' | 'subscription' | 'app' | 'danger-zone' | 'account-access'

/**
 * Single source of truth for each page's icon + label key. Consumed by the
 * page bar, the mobile directory-page nav list, and the modal header — so
 * icon/copy can't drift between the three surfaces.
 */
export const PAGE_META: Record<PageValue, { icon: string; labelKey: string }> = {
  profile: { icon: 'user-sticker-square', labelKey: 'settings.tab.profile' },
  app: { icon: 'headphones', labelKey: 'settings.tab.app' },
  subscription: { icon: 'piggy-bank', labelKey: 'settings.tab.subscription' },
  'danger-zone': { icon: 'delete', labelKey: 'settings.tab.danger-zone' },
  'account-access': { icon: 'keyhole', labelKey: 'settings.tab.account-access' }
}

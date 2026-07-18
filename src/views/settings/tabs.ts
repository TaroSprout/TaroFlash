export type TabValue = 'profile' | 'subscription' | 'app' | 'danger-zone' | 'account-access'

/**
 * Single source of truth for each tab's icon + label key. Consumed by the tab
 * bar, the mobile tab-index nav list, and the modal header — so icon/copy
 * can't drift between the three surfaces.
 */
export const TAB_META: Record<TabValue, { icon: string; labelKey: string }> = {
  profile: { icon: 'user-sticker-square', labelKey: 'settings.tab.profile' },
  app: { icon: 'headphones', labelKey: 'settings.tab.app' },
  subscription: { icon: 'piggy-bank', labelKey: 'settings.tab.subscription' },
  'danger-zone': { icon: 'delete', labelKey: 'settings.tab.danger-zone' },
  'account-access': { icon: 'keyhole', labelKey: 'settings.tab.account-access' }
}

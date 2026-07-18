export type TabValue = 'details' | 'design' | 'review-pacing' | 'review-history' | 'danger-zone'

/**
 * Single source of truth for each tab's icon + label key. Consumed by the tab
 * bar, the mobile directory-page nav list, and the modal header — so icon/copy
 * can't drift between the three surfaces.
 */
export const TAB_META: Record<TabValue, { icon: string; labelKey: string; full_bleed?: boolean }> =
  {
    details: { icon: 'text-field', labelKey: 'deck.settings-modal.tab.details' },
    design: { icon: 'paint-brush', labelKey: 'deck.settings-modal.tab.design' },
    'review-pacing': {
      icon: 'card-deck',
      labelKey: 'deck.settings-modal.tab.review-pacing',
      // Claims the whole content area: the pinned preview tucks away and the
      // aside retracts, so this tab carries its own save button.
      full_bleed: true
    },
    'review-history': { icon: 'schedule', labelKey: 'deck.settings-modal.tab.review-history' },
    'danger-zone': { icon: 'delete', labelKey: 'deck.settings-modal.tab.danger-zone' }
  }

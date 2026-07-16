export type TabValue = 'details' | 'design' | 'review-pacing' | 'danger-zone'

/**
 * Single source of truth for each tab's icon + label key. Consumed by the tab
 * bar, the mobile tab-index nav list, and the modal header — so icon/copy
 * can't drift between the three surfaces.
 */
export const TAB_META: Record<TabValue, { icon: string; labelKey: string }> = {
  details: { icon: 'text-field', labelKey: 'deck.settings-modal.tab.details' },
  design: { icon: 'paint-brush', labelKey: 'deck.settings-modal.tab.design' },
  'review-pacing': { icon: 'card-deck', labelKey: 'deck.settings-modal.tab.review-pacing' },
  'danger-zone': { icon: 'delete', labelKey: 'deck.settings-modal.tab.danger-zone' }
}

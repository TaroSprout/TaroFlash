// Display names and marketing copy for each plan. Enforced numeric limits live
// in the `plans` DB table, surfaced per-member via useMemberStore().deck_limit —
// the `decks`/`cards` feature counts below are display copy and can drift.
// `features` drives all plan-feature surfaces (welcome screen, signup, settings upsell).
// `upgradeHighlight` marks features shown in the settings upgrade teaser.

// Free plan's deck limit, mirrored from the `plans` DB table. A const because
// callers need it while the member is still `paid` (their deck_limit row is the paid one).
export const FREE_DECK_LIMIT = 10

export type PlanFeature = {
  key: string
  ok?: boolean
  count?: number | null
  upgradeHighlight?: boolean
}

export type PlanConfig = {
  displayName: string
  monthlyPriceUsd: number | null
  features: PlanFeature[]
}

export const PLANS: Record<MemberPlan, PlanConfig> = {
  free: {
    displayName: 'Pocket Player',
    monthlyPriceUsd: null,
    features: [
      { key: 'decks', count: 10 },
      { key: 'cards', count: 500 },
      { key: 'deck-images' },
      { key: 'review-history', count: 1 },
      { key: 'no-card-images', ok: false }
    ]
  },
  paid: {
    displayName: 'Deck Builder',
    monthlyPriceUsd: 8,
    features: [
      { key: 'all-free-features' },
      { key: 'no-deck-limit', upgradeHighlight: true },
      { key: 'no-card-limit', upgradeHighlight: true },
      { key: 'card-images', upgradeHighlight: true },
      { key: 'review-history', upgradeHighlight: true },
      { key: 'cancel-anytime' }
    ]
  }
}

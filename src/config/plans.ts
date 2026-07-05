// Display names and marketing copy for each plan. The enforced numeric
// limits (deck count, cards per deck) live in the `plans` DB table now —
// see src/composables/plan-limits.ts — not here, so there's one source for
// them instead of two. The `decks`/`cards` feature counts below are still
// hardcoded display copy and will drift if the DB limits change again.
// `features` drives all plan-feature surfaces (welcome screen, signup, settings upsell).
// `upgradeHighlight` marks features shown in the settings upgrade teaser.
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

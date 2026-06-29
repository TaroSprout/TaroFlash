// Display names and entitlement limits for each plan.
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
  deckLimit: number | null
  cardsPerDeckLimit: number | null
  monthlyPriceUsd: number | null
  features: PlanFeature[]
}

export const PLANS: Record<MemberPlan, PlanConfig> = {
  free: {
    displayName: 'Pocket Player',
    deckLimit: 5,
    cardsPerDeckLimit: 200,
    monthlyPriceUsd: null,
    features: [
      { key: 'decks', count: 5 },
      { key: 'cards', count: 200 },
      { key: 'deck-images' },
      { key: 'no-card-images', ok: false }
    ]
  },
  paid: {
    displayName: 'Deck Builder',
    deckLimit: null,
    cardsPerDeckLimit: null,
    monthlyPriceUsd: 8,
    features: [
      { key: 'no-deck-limit', upgradeHighlight: true },
      { key: 'no-card-limit', upgradeHighlight: true },
      { key: 'deck-images' },
      { key: 'card-images', upgradeHighlight: true },
      { key: 'review-history', upgradeHighlight: true },
      { key: 'cancel-anytime' }
    ]
  }
}

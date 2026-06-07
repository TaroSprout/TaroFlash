type PlanConfig = {
  deckLimit: number | null
  cardsPerDeckLimit: number | null
}

export const PLANS: Record<MemberPlan, PlanConfig> = {
  free: { deckLimit: 5, cardsPerDeckLimit: 200 },
  paid: { deckLimit: null, cardsPerDeckLimit: null }
}

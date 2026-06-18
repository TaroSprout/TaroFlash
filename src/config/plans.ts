type PlanConfig = {
  displayName: string
  deckLimit: number | null
  cardsPerDeckLimit: number | null
}

export const PLANS: Record<MemberPlan, PlanConfig> = {
  free: { displayName: 'Player', deckLimit: 5, cardsPerDeckLimit: 200 },
  paid: { displayName: 'Builder', deckLimit: null, cardsPerDeckLimit: null }
}

// Display names live on the `plans` table (members→plans join → plan_display_name).
// This config holds only the entitlement limits the FE gates on.
type PlanConfig = {
  deckLimit: number | null
  cardsPerDeckLimit: number | null
}

export const PLANS: Record<MemberPlan, PlanConfig> = {
  free: { deckLimit: 5, cardsPerDeckLimit: 200 },
  paid: { deckLimit: null, cardsPerDeckLimit: null }
}

/** Perf budgets the dev overlay (`usePerfOverlay`) reads every metric against. */
export const PERF_BUDGET = {
  // 60fps frame budget.
  frameMs: 16.7,
  // Seeded from a heavy deck-grid + study-session screen plus headroom; tune as real ceilings surface.
  maxOnScreenElements: 1200,
  // Fraction of the viewport standing effects (bgx patterns, backdrop blurs, ambient loops) may cover at once.
  maxStandingEffectAreaRatio: 0.35
} as const

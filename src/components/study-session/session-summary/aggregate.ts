import type { CardReviewResult } from '@/components/study-session/composables/session-core'

/**
 * Pure FSRS-aware aggregation for the post-session summary. Turns the raw
 * per-card results captured during a session into the four headline counts the
 * summary tile renders. No reactivity, no i18n — just data in, data out.
 *
 * Maturity bands bucket cards by their scheduled interval (the real mastery
 * signal), not by FSRS state, which is a weak proxy for how well something is
 * known. A card "levels up" when its review pushes it across a band boundary
 * and "levels down" when a failure drops it back below one.
 */

export type MaturityBand = 'forming' | 'familiar' | 'strong' | 'mastered'

export type SummaryData = {
  score: number
  total: number
  new_count: number
  leveled_up_count: number
  leveled_down_count: number
  stuck_count: number
}

// Ordered weakest → strongest; the index is the comparable "level".
const BAND_ORDER: MaturityBand[] = ['forming', 'familiar', 'strong', 'mastered']

// Hanzi routinely take many lapses before sticking; 8 flags too aggressively.
// Bumped to 24 so only genuinely stubborn cards surface. TODO: expose in settings.
const LEECH_THRESHOLD = 24

function levelFor(interval_days: number): number {
  if (interval_days < 7) return BAND_ORDER.indexOf('forming')
  if (interval_days < 30) return BAND_ORDER.indexOf('familiar')
  if (interval_days < 90) return BAND_ORDER.indexOf('strong')
  return BAND_ORDER.indexOf('mastered')
}

export function aggregateSession(results: CardReviewResult[]): SummaryData {
  let score = 0
  let new_count = 0
  let leveled_up_count = 0
  let leveled_down_count = 0
  let stuck_count = 0

  for (const result of results) {
    if (result.passed) score++

    if (!result.passed && result.lapses >= LEECH_THRESHOLD) stuck_count++

    if (result.is_new) {
      new_count++
      continue
    }

    const before = levelFor(result.before_interval)
    const after = levelFor(result.after_interval)

    if (after > before) leveled_up_count++
    else if (after < before) leveled_down_count++
  }

  return {
    score,
    total: results.length,
    new_count,
    leveled_up_count,
    leveled_down_count,
    stuck_count
  }
}

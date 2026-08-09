import type { CardReviewResult } from '@/views/study-session/composables/session-engine'

export type MaturityBand = 'forming' | 'familiar' | 'strong' | 'mastered'

/** The categories the summary lists, in display order. */
export type SummaryCategory = 'correct' | 'new' | 'strengthened' | 'weakened' | 'stuck'

export type SummaryData = {
  total: number
  groups: Record<SummaryCategory, CardReviewResult[]>
  /** The failed half of `correct`'s page — the two render as separate sections. */
  incorrect: CardReviewResult[]
}

// Ordered weakest → strongest; the index is the comparable "level".
const BAND_ORDER: MaturityBand[] = ['forming', 'familiar', 'strong', 'mastered']

function levelFor(interval_days: number): number {
  if (interval_days < 7) return BAND_ORDER.indexOf('forming')
  if (interval_days < 30) return BAND_ORDER.indexOf('familiar')
  if (interval_days < 90) return BAND_ORDER.indexOf('strong')
  return BAND_ORDER.indexOf('mastered')
}

/**
 * Pure FSRS-aware aggregation for the post-session summary — no reactivity, no
 * i18n, just data in, data out.
 *
 * Buckets each result into the categories the summary lists. Maturity bands
 * come from a card's scheduled interval (the real mastery signal), not FSRS
 * state, which is a weak proxy for how well something is known — a card
 * "levels up" crossing a band boundary upward, "levels down" dropping back
 * across one on a failure.
 *
 * Each bucket keeps the results themselves, not a count — the summary opens a
 * page per category listing its cards, and counts are just `.length`.
 */
export function aggregateSession(
  results: CardReviewResult[],
  thresholdFor: (deck_id?: number) => number
): SummaryData {
  const groups: Record<SummaryCategory, CardReviewResult[]> = {
    correct: [],
    new: [],
    strengthened: [],
    weakened: [],
    stuck: []
  }
  const incorrect: CardReviewResult[] = []

  for (const result of results) {
    if (result.passed) groups.correct.push(result)
    else incorrect.push(result)

    if (!result.passed && result.lapses >= thresholdFor(result.deck_id)) groups.stuck.push(result)

    if (result.is_new) {
      groups.new.push(result)
      continue
    }

    const before = levelFor(result.before_interval)
    const after = levelFor(result.after_interval)

    if (after > before) groups.strengthened.push(result)
    else if (after < before) groups.weakened.push(result)
  }

  return { total: results.length, groups, incorrect }
}

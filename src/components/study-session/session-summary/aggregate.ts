import type { CardReviewResult } from '@/components/study-session/composables/session-core'

/**
 * Pure FSRS-aware aggregation for the post-session summary. Turns the raw
 * per-card results captured during a session into the shaped data the summary
 * sections render. No reactivity, no i18n — just data in, data out.
 *
 * Bands bucket cards by their scheduled interval (the real mastery signal),
 * not by FSRS state, which is a weak proxy for how well something is known.
 */

export type MaturityBand = 'forming' | 'familiar' | 'strong' | 'mastered'
export type TimelineKey = '1d' | '3d' | '1w' | '2w' | '1mo' | '3mo' | '6mo' | 'max'

export type SummaryData = {
  score: number
  total: number
  new_count: number
  reinforced_count: number
  mastery_before: Record<MaturityBand, number>
  mastery_after: Record<MaturityBand, number>
  timeline: { key: TimelineKey; count: number }[]
  leeches: { card_id: number; front_text: string; lapses: number }[]
}

export const BAND_ORDER: MaturityBand[] = ['forming', 'familiar', 'strong', 'mastered']

// Hanzi routinely take many lapses before sticking; 8 flags too aggressively.
// Bumped to 24 so only genuinely stubborn cards surface. TODO: expose in settings.
const LEECH_THRESHOLD = 24

/**
 * Ordered, log-spaced return-interval bins — the single source of truth for
 * timeline bucketing. `max_days` is the inclusive upper bound; the final bin
 * is open-ended. SRS intervals grow exponentially, so the bins do too.
 */
const TIMELINE_BINS: { key: TimelineKey; max_days: number }[] = [
  { key: '1d', max_days: 1 },
  { key: '3d', max_days: 3 },
  { key: '1w', max_days: 7 },
  { key: '2w', max_days: 14 },
  { key: '1mo', max_days: 30 },
  { key: '3mo', max_days: 90 },
  { key: '6mo', max_days: 180 },
  { key: 'max', max_days: Infinity }
]

function bandFor(interval_days: number): MaturityBand {
  if (interval_days < 7) return 'forming'
  if (interval_days < 30) return 'familiar'
  if (interval_days < 90) return 'strong'
  return 'mastered'
}

function binFor(interval_days: number): TimelineKey {
  return (TIMELINE_BINS.find((bin) => interval_days <= bin.max_days) ?? TIMELINE_BINS.at(-1)!).key
}

function emptyBands(): Record<MaturityBand, number> {
  return { forming: 0, familiar: 0, strong: 0, mastered: 0 }
}

/**
 * Build the timeline buckets in bin order, dropping every empty bucket so the
 * chart only shows intervals that actually occurred this session.
 */
function buildTimeline(counts: Map<TimelineKey, number>): SummaryData['timeline'] {
  return TIMELINE_BINS.map((bin) => ({ key: bin.key, count: counts.get(bin.key) ?? 0 })).filter(
    (bucket) => bucket.count > 0
  )
}

export function aggregateSession(results: CardReviewResult[]): SummaryData {
  const mastery_before = emptyBands()
  const mastery_after = emptyBands()
  const timeline_counts = new Map<TimelineKey, number>()
  const leeches: SummaryData['leeches'] = []

  let score = 0
  let new_count = 0
  let reinforced_count = 0

  for (const result of results) {
    if (result.passed) score++

    const bin = binFor(result.after_interval)
    timeline_counts.set(bin, (timeline_counts.get(bin) ?? 0) + 1)

    if (result.is_new) {
      new_count++
    } else {
      reinforced_count++
      mastery_before[bandFor(result.before_interval)]++
      mastery_after[bandFor(result.after_interval)]++
    }

    if (!result.passed && result.lapses >= LEECH_THRESHOLD && result.front_text) {
      leeches.push({
        card_id: result.card_id,
        front_text: result.front_text,
        lapses: result.lapses
      })
    }
  }

  return {
    score,
    total: results.length,
    new_count,
    reinforced_count,
    mastery_before,
    mastery_after,
    timeline: buildTimeline(timeline_counts),
    leeches
  }
}

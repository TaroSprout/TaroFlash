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
export type TimelineKey = '1d' | '3d' | '1w' | '2w' | '1m'

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
export const TIMELINE_ORDER: TimelineKey[] = ['1d', '3d', '1w', '2w', '1m']

const LEECH_THRESHOLD = 8

function bandFor(interval_days: number): MaturityBand {
  if (interval_days < 7) return 'forming'
  if (interval_days < 30) return 'familiar'
  if (interval_days < 90) return 'strong'
  return 'mastered'
}

function timelineFor(interval_days: number): TimelineKey {
  if (interval_days <= 1) return '1d'
  if (interval_days <= 3) return '3d'
  if (interval_days <= 7) return '1w'
  if (interval_days <= 14) return '2w'
  return '1m'
}

function emptyBands(): Record<MaturityBand, number> {
  return { forming: 0, familiar: 0, strong: 0, mastered: 0 }
}

export function aggregateSession(results: CardReviewResult[]): SummaryData {
  const mastery_before = emptyBands()
  const mastery_after = emptyBands()
  const timeline_counts: Record<TimelineKey, number> = {
    '1d': 0,
    '3d': 0,
    '1w': 0,
    '2w': 0,
    '1m': 0
  }
  const leeches: SummaryData['leeches'] = []

  let score = 0
  let new_count = 0
  let reinforced_count = 0

  for (const result of results) {
    if (result.passed) score++
    timeline_counts[timelineFor(result.after_interval)]++

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
    timeline: TIMELINE_ORDER.map((key) => ({ key, count: timeline_counts[key] })),
    leeches
  }
}

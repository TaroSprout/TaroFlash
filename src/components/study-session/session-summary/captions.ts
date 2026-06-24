import type { MaturityBand, SummaryData } from './aggregate'

/**
 * Rule-based caption selection. Each caption returns an i18n key (and optional
 * params) gated on a derived fact, so the chosen sentence is true by
 * construction. No `t()` here — the component translates, keeping this pure.
 */

export type Caption = { key: string; params?: Record<string, string | number> }

const BAND_INDEX: Record<MaturityBand, number> = {
  forming: 0,
  familiar: 1,
  strong: 2,
  mastered: 3
}

function weightedAvg(bands: Record<MaturityBand, number>, total: number) {
  if (!total) return 0
  let sum = 0
  for (const band of Object.keys(BAND_INDEX) as MaturityBand[]) {
    sum += bands[band] * BAND_INDEX[band]
  }
  return sum / total
}

export function masteryCaption(data: SummaryData): Caption {
  if (!data.reinforced_count) return { key: 'session-summary.reinforced.caption.held' }

  const before = weightedAvg(data.mastery_before, data.reinforced_count)
  const after = weightedAvg(data.mastery_after, data.reinforced_count)
  const delta = after - before

  if (delta > 0.3) return { key: 'session-summary.reinforced.caption.climbed' }
  if (delta < -0.05) return { key: 'session-summary.reinforced.caption.slipped' }
  return { key: 'session-summary.reinforced.caption.held' }
}

export function timelineCaption(data: SummaryData): Caption {
  const total = data.timeline.reduce((sum, bucket) => sum + bucket.count, 0)
  if (!total) return { key: 'session-summary.timeline.caption.spread', params: { whenKey: '1m' } }

  const within_week = data.timeline
    .filter((bucket) => bucket.key === '1d' || bucket.key === '3d' || bucket.key === '1w')
    .reduce((sum, bucket) => sum + bucket.count, 0)

  if (within_week / total > 0.6) return { key: 'session-summary.timeline.caption.soon' }

  const busiest = [...data.timeline].sort((a, b) => b.count - a.count)[0]
  return { key: 'session-summary.timeline.caption.spread', params: { whenKey: busiest.key } }
}

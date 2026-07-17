export type LearningStepsKey = '10m' | '1hr' | '1d' | '1m-10m' | '1m-10m-1d'
export type RelearningStepsKey = '10m' | '1hr' | '1d' | '1m-10m'

// ts-fsrs' own default maximum_interval (~100 years) — the "uncapped" value a
// null/0 max_interval resolves to before it reaches the scheduler.
export const FSRS_MAX_INTERVAL = 36500

// Mirrors the system preset's leech_threshold default — only a defensive
// fallback for when a resolved deck value is somehow absent.
export const DEFAULT_LEECH_THRESHOLD = 8

export const LEECH_THRESHOLD_BOUNDS = { min: 1, max: 99, step: 1 } as const
// 0 in the UI means "uncapped"; the model stores that as null.
export const MAX_INTERVAL_BOUNDS = { min: 0, max: FSRS_MAX_INTERVAL, step: 15 } as const

export const LEARNING_STEP_PRESETS: Record<LearningStepsKey, string[]> = {
  '10m': ['10m'],
  '1hr': ['1h'],
  '1d': ['1d'],
  '1m-10m': ['1m', '10m'],
  '1m-10m-1d': ['1m', '10m', '1d']
}

export const RELEARNING_STEP_PRESETS: Record<RelearningStepsKey, string[]> = {
  '10m': ['10m'],
  '1hr': ['1h'],
  '1d': ['1d'],
  '1m-10m': ['1m', '10m']
}

/** Reverse-match a `string[]` of step durations back to its preset key, falling back when no exact match exists. */
export function keyForSteps<K extends string>(
  presets: Record<K, string[]>,
  steps: string[],
  fallback: K
): K {
  const match = (Object.keys(presets) as K[]).find(
    (key) => presets[key].length === steps.length && presets[key].every((s, i) => s === steps[i])
  )
  return match ?? fallback
}

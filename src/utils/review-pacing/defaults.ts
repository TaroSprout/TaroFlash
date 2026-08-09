export type LearningStepsKey = '10m' | '1hr' | '1d' | '1m-10m' | '1m-10m-1d'
export type RelearningStepsKey = '10m' | '1hr' | '1d' | '1m-10m'

// What "no ceiling" resolves to before it reaches the scheduler — roughly a
// hundred years, which is the scheduler's own idea of unlimited.
export const FSRS_MAX_INTERVAL = 36500

// A fallback only. The system preset carries the real value; if you're reading
// this one, something upstream failed to resolve.
export const DEFAULT_LEECH_THRESHOLD = 8

// Don't widen these. Below 70 the scheduler thrashes; above 97 every card
// comes back near-daily. The scheduler itself rejects the range outside.
export const DESIRED_RETENTION_BOUNDS = { min: 70, max: 97, step: 1 } as const

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

export type LearningStepsKey = '10m' | '1hr' | '1d' | '1m-10m' | '1m-10m-1d'
export type RelearningStepsKey = '10m' | '1hr' | '1d' | '1m-10m'

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

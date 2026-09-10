export type MotionTier = 'minimal' | 'lean' | 'full'

export interface MotionTierFactors {
  duration: number
  stagger: number
  standing_effects: boolean
}

export const MOTION_TIER_FACTORS: Record<MotionTier, MotionTierFactors> = {
  full: { duration: 1, stagger: 1, standing_effects: true },
  lean: { duration: 0.8, stagger: 0.5, standing_effects: true },
  minimal: { duration: 0.5, stagger: 0, standing_effects: false }
}

export interface MotionSignals {
  device_memory?: number
  cores?: number
}

/**
 * Picks a tier from a device's hardware hints.
 *
 * `deviceMemory` is Chromium-only, so its absence isn't a weak device — it's an
 * unknown one (every iOS and Firefox device), which we trust at `full` rather
 * than guess down from `hardwareConcurrency` alone.
 */
export function tierFromSignals(signals: MotionSignals): MotionTier {
  const { device_memory, cores } = signals

  if (device_memory === undefined) return 'full'

  if (device_memory <= 2 || (cores !== undefined && cores <= 2)) return 'minimal'
  if (device_memory <= 4 || (cores !== undefined && cores <= 4)) return 'lean'

  return 'full'
}

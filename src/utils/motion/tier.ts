export type MotionTier = 'minimal' | 'lean' | 'full'

export interface MotionTierFactors {
  duration: number
  stagger: number
  standing_effects: boolean
  /**
   * How many height tweens may run app-wide at once. Height is the one non-compositor
   * tween the app sanctions, so a weak tier caps it hard; `minimal` bans it at zero.
   */
  height_tween_budget: number
}

export const MOTION_TIER_FACTORS: Record<MotionTier, MotionTierFactors> = {
  full: { duration: 1, stagger: 1, standing_effects: true, height_tween_budget: 4 },
  lean: { duration: 0.8, stagger: 0.5, standing_effects: true, height_tween_budget: 2 },
  minimal: { duration: 0.5, stagger: 0, standing_effects: false, height_tween_budget: 0 }
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

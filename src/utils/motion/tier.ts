export type MotionTier = 'minimal' | 'lean' | 'full'

/** Per-tier knobs the driver, stage, and CSS read to decide how they honor a tier. */
export interface MotionTierFactors {
  /** Multiplier applied to every animation's duration. */
  duration: number
  /** Multiplier applied to inter-item stagger; `0` collapses a staggered run to one step. */
  stagger: number
  /** Whether ambient, always-running effects (idle shimmers, drifts) play at all. */
  standing_effects: boolean
}

export const MOTION_TIER_FACTORS: Record<MotionTier, MotionTierFactors> = {
  full: { duration: 1, stagger: 1, standing_effects: true },
  lean: { duration: 0.8, stagger: 0.5, standing_effects: true },
  minimal: { duration: 0.5, stagger: 0, standing_effects: false }
}

/**
 * The static hardware hints a tier is guessed from. `device_memory` mirrors
 * `navigator.deviceMemory` (GB) and `cores` mirrors `navigator.hardwareConcurrency`.
 */
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

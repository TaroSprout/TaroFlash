import { defineStore } from 'pinia'
import { useMatchMedia } from '@/composables/ui/media-query'
import {
  MOTION_TIER_FACTORS,
  tierFromSignals,
  type MotionSignals,
  type MotionTier
} from '@/utils/motion/tier'

function readSignals(): MotionSignals {
  return {
    device_memory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
    cores: navigator.hardwareConcurrency
  }
}

export const useMotionStore = defineStore('motion', () => {
  // Fixed for the session: hardware can't change under a running tab, and a stable
  // tier keeps every animation reading one budget from first paint onward.
  const tier: MotionTier = tierFromSignals(readSignals())
  const factors = MOTION_TIER_FACTORS[tier]

  // Kept separate from the tier: a reduced-motion request never demotes the tier,
  // and a minimal-tier device is never treated as having requested reduced motion.
  const prefers_reduced_motion = useMatchMedia('reduced-motion')
  const has_coarse_pointer = useMatchMedia('coarse')

  // The only writer of `data-motion`, the way theme.ts owns `data-mode`. Written
  // once because the tier never changes; reduced-motion and pointer stay off it.
  function load(): void {
    document.documentElement.setAttribute('data-motion', tier)
  }

  return { tier, factors, prefers_reduced_motion, has_coarse_pointer, load }
})

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
  const tier: MotionTier = tierFromSignals(readSignals())
  const factors = MOTION_TIER_FACTORS[tier]

  const prefers_reduced_motion = useMatchMedia('reduced-motion') // never demotes the tier itself
  const has_coarse_pointer = useMatchMedia('coarse')

  /** The only writer of `data-motion`, the way `theme.ts` owns `data-mode`. */
  function load(): void {
    document.documentElement.setAttribute('data-motion', tier)
  }

  return { tier, factors, prefers_reduced_motion, has_coarse_pointer, load }
})

import { gsap } from 'gsap'
import { useMotionStore } from '@/stores/motion'

const BAND_DURATION = 0.28

export function bandMotionSafe(): boolean {
  return !useMotionStore().prefers_reduced_motion
}

export function setBand(band: HTMLElement, height: number) {
  gsap.set(band, { height })
}

export function resizeBand(band: HTMLElement, height: number): Promise<void> {
  gsap.killTweensOf(band)

  return new Promise((resolve) => {
    gsap.to(band, {
      height,
      duration: BAND_DURATION,
      ease: 'power2.out',
      onComplete: resolve
    })
  })
}

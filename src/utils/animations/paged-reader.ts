import { gsap } from 'gsap'

const BAND_DURATION = 0.28

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

export function setBand(band: HTMLElement, height: number) {
  gsap.set(band, { height })
}

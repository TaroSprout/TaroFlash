import { gsap } from 'gsap'

const BAND_DURATION = 0.28
const SLIDE_DURATION = 0.2

export function slidePage(scroller: HTMLElement, to: number, onComplete: () => void) {
  const proxy = { x: scroller.scrollLeft }
  gsap.killTweensOf(proxy)
  gsap.to(proxy, {
    x: to,
    duration: SLIDE_DURATION,
    ease: 'power2.out',
    onUpdate: () => (scroller.scrollLeft = proxy.x),
    onComplete
  })
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

export function setBand(band: HTMLElement, height: number) {
  gsap.set(band, { height })
}

import { gsap } from 'gsap'
import { useMotionStore } from '@/stores/motion'

const BAND_DURATION = 0.28
const SLIDE_DURATION = 0.2
const FROST_BLUR = 3
const FROST_FADE = 0.32

export function frostMotionSafe() {
  return !useMotionStore().prefers_reduced_motion
}

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

export function primeFrost(frost: HTMLElement, layer: HTMLElement, live: HTMLElement) {
  gsap.killTweensOf([frost, layer, live])
  gsap.set(frost, { display: 'block', opacity: 1 })
  gsap.set(layer, { transformOrigin: '0 0', filter: `blur(${FROST_BLUR}px)`, scaleX: 1, scaleY: 1 })
  gsap.set(live, { opacity: 0 })
}

export function scaleFrost(layer: HTMLElement, sx: number, sy: number) {
  gsap.set(layer, { scaleX: sx, scaleY: sy })
}

export function settleFrost(frost: HTMLElement, live: HTMLElement): Promise<void> {
  gsap.killTweensOf([frost, live])
  return new Promise((resolve) => {
    gsap.to(live, { opacity: 1, duration: FROST_FADE, ease: 'power1.out' })
    gsap.to(frost, {
      opacity: 0,
      duration: FROST_FADE,
      ease: 'power1.out',
      onComplete: () => {
        gsap.set(frost, { display: 'none' })
        resolve()
      }
    })
  })
}

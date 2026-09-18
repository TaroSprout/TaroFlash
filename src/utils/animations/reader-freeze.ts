import { gsap } from 'gsap'
import { useMotionStore } from '@/stores/motion'

const FREEZE_BLUR = 3
const REVEAL_DURATION = 0.32
const REVEAL_MS = REVEAL_DURATION * 1000

export function freezeMotionSafe(): boolean {
  return !useMotionStore().prefers_reduced_motion
}

export function primeFreeze(surface: HTMLElement, width: number) {
  gsap.killTweensOf(surface)
  gsap.set(surface, {
    width,
    transformOrigin: '0 0',
    filter: `blur(${FREEZE_BLUR}px)`,
    scaleX: 1,
    scaleY: 1
  })
}

export function scaleFreeze(surface: HTMLElement, sx: number, sy: number) {
  gsap.set(surface, { scaleX: sx, scaleY: sy })
}

export function settleFreeze(surface: HTMLElement): Promise<void> {
  gsap.killTweensOf(surface)
  gsap.set(surface, { clearProps: 'width' })

  surface.style.transition = `filter ${REVEAL_MS}ms ease-out`
  surface.style.filter = 'blur(0px)'

  return new Promise((resolve) => {
    gsap.to(surface, {
      scaleX: 1,
      scaleY: 1,
      duration: REVEAL_DURATION,
      ease: 'power1.out',
      onComplete: () => {
        gsap.set(surface, { clearProps: 'transform,transformOrigin' })
        surface.style.transition = ''
        surface.style.filter = ''
        resolve()
      }
    })
  })
}

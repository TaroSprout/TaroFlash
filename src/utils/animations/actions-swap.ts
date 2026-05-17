import { gsap } from 'gsap'

const DURATION = 0.22
const SLIDE_OFFSET = 16
const SCALE_OUT = 0.92

/** Default action stack — scale + fade in. Pair with `defaultLeave`. */
export function defaultEnter(el: Element, done: () => void) {
  gsap.fromTo(
    el,
    { opacity: 0, scale: SCALE_OUT },
    {
      opacity: 1,
      scale: 1,
      duration: DURATION,
      ease: 'power2.out',
      clearProps: 'transform,opacity',
      onComplete: done
    }
  )
}

/** Default action stack — scale + fade out as bulk slides over it. */
export function defaultLeave(el: Element, done: () => void) {
  gsap.to(el, {
    opacity: 0,
    scale: SCALE_OUT,
    duration: DURATION,
    ease: 'power2.out',
    onComplete: done
  })
}

/** Bulk stack — slide up from below + fade in. Pair with `bulkLeave`. */
export function bulkEnter(el: Element, done: () => void) {
  gsap.fromTo(
    el,
    { opacity: 0, y: SLIDE_OFFSET },
    {
      opacity: 1,
      y: 0,
      duration: DURATION,
      ease: 'power2.out',
      clearProps: 'transform,opacity',
      onComplete: done
    }
  )
}

/** Bulk stack — slide back down + fade out. */
export function bulkLeave(el: Element, done: () => void) {
  gsap.to(el, {
    opacity: 0,
    y: SLIDE_OFFSET,
    duration: DURATION,
    ease: 'power2.out',
    onComplete: done
  })
}

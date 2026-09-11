import { gsap } from 'gsap'

const DURATION = 0.22
const SLIDE_OFFSET = 16
const SCALE_OUT = 0.92

/** Scale + fade in. Pair with `scaleFadeLeave`. */
export function scaleFadeEnter(el: Element, done: () => void) {
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

/** Scale + fade out as the incoming stack slides over it. */
export function scaleFadeLeave(el: Element, done: () => void) {
  gsap.to(el, {
    opacity: 0,
    scale: SCALE_OUT,
    duration: DURATION,
    ease: 'power2.out',
    onComplete: done
  })
}

/** Rise up from below + fade in. Pair with `riseFadeLeave`. */
export function riseFadeEnter(el: Element, done: () => void) {
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

/** Sink back down + fade out. */
export function riseFadeLeave(el: Element, done: () => void) {
  gsap.to(el, {
    opacity: 0,
    y: SLIDE_OFFSET,
    duration: DURATION,
    ease: 'power2.out',
    onComplete: done
  })
}

import { gsap } from 'gsap'

const ENTER_DURATION = 0.1
const LEAVE_DURATION = 0.13
const OFFSET = 24

/** Slide-in from the right + fade in. Pair with `slideFadeRightLeave`. */
export function slideFadeRightEnter(el: Element, done: () => void) {
  gsap.fromTo(
    el,
    { opacity: 0, x: OFFSET },
    {
      opacity: 1,
      x: 0,
      duration: ENTER_DURATION,
      ease: 'power2.out',
      clearProps: 'transform,rotate',
      onComplete: done
    }
  )
}

/** Slide-out to the right + fade out. */
export function slideFadeRightLeave(el: Element, done: () => void) {
  gsap.to(el, {
    opacity: 0,
    x: OFFSET,
    duration: LEAVE_DURATION,
    ease: 'power2.out',
    onComplete: done
  })
}

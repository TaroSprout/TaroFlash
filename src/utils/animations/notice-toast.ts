import { gsap } from 'gsap'

const DURATION = 0.14
const OFFSET = 24

/** Slide-down + fade in. Pairs with `noticeToastLeave`. */
export function noticeToastEnter(el: Element, done: () => void) {
  gsap.fromTo(
    el,
    { opacity: 0, y: -OFFSET },
    {
      opacity: 1,
      y: 0,
      duration: DURATION,
      ease: 'power2.out',
      clearProps: 'transform',
      onComplete: done
    }
  )
}

/** Slide-up + fade out. */
export function noticeToastLeave(el: Element, done: () => void) {
  gsap.to(el, { opacity: 0, y: -OFFSET, duration: DURATION, ease: 'power2.out', onComplete: done })
}

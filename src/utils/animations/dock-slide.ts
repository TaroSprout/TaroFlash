import { gsap } from 'gsap'

// Matches the dock's content-height tween (`useAnimatedHeight`'s `DURATION`), so the bar's
// slide and its content growing into place read as one movement.
const DURATION = 0.2

/** Mobile dock bar appearing — slides up from the bottom edge instead of popping in. */
export function dockSlideIn(el: Element, done: () => void) {
  gsap.fromTo(
    el,
    { yPercent: 100 },
    {
      yPercent: 0,
      duration: DURATION,
      ease: 'power2.out',
      clearProps: 'transform',
      onComplete: done
    }
  )
}

/** Mobile dock bar disappearing — slides back down off the bottom edge. */
export function dockSlideOut(el: Element, done: () => void) {
  gsap.to(el, { yPercent: 100, duration: DURATION, ease: 'power2.out', onComplete: done })
}

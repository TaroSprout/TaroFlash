import { gsap } from 'gsap'

const HOLD_DURATION = 1.4
const FLIP_DURATION = 0.5
const FLIP_PERSPECTIVE = 800

/**
 * One beat of a deck cover cycling through the covers inside it — a pause,
 * then a half-turn.
 *
 * @param onMidpoint - Swap the displayed cover here, the frame where the card
 *   is edge-on and the change can't be seen.
 */
export function cycleCoverCard(el: HTMLElement, onMidpoint: () => void): gsap.core.Timeline {
  const tl = gsap.timeline()

  // Set the perspective before any rotation, never alongside it — the very
  // first flip renders as a flat squish otherwise.
  tl.set(el, { transformPerspective: FLIP_PERSPECTIVE })
  tl.to(el, { duration: HOLD_DURATION })
  tl.to(el, {
    rotateY: 90,
    duration: FLIP_DURATION / 2,
    ease: 'power2.in',
    onComplete: onMidpoint
  })
  tl.set(el, { rotateY: -90 })
  tl.to(el, { rotateY: 0, duration: FLIP_DURATION / 2, ease: 'power2.out' })

  return tl
}

/** Clears the carousel's transform so the card sits flat when cycling stops. */
export function resetCoverCard(el: HTMLElement) {
  gsap.set(el, { clearProps: 'rotateY,transformPerspective' })
}

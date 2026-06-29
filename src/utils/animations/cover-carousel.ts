import { gsap } from 'gsap'

const HOLD_DURATION = 1.4
const FLIP_DURATION = 0.5
const FLIP_PERSPECTIVE = 800

/**
 * One beat of the multi-deck cover carousel: holds the card flat, then flips it
 * a half-turn on its Y axis, swapping the displayed cover at the edge-on
 * midpoint via `onMidpoint`. Returns the timeline so the caller can chain the
 * next beat (onComplete) or kill it on stop.
 */
export function cycleCoverCard(el: HTMLElement, onMidpoint: () => void): gsap.core.Timeline {
  const tl = gsap.timeline()

  // Establish the perspective before any rotation. Without it the first
  // rotateY renders as a flat horizontal squish (scaleX = cos θ) — the jank
  // only the first flip shows, before GSAP has baked perspective into the
  // element's inline transform.
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

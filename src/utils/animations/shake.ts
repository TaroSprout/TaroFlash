import { gsap } from 'gsap'

const SHAKE_DISTANCE = 6
const SHAKE_STEP_DURATION = 0.08

/** Rattles an element side to side, e.g. to flag a repeat failure. */
export function shake(el: Element) {
  return new Promise<void>((resolve) => {
    gsap
      .timeline({ onComplete: resolve })
      .to(el, { x: -SHAKE_DISTANCE, duration: SHAKE_STEP_DURATION })
      .to(el, { x: SHAKE_DISTANCE, duration: SHAKE_STEP_DURATION })
      .to(el, { x: -SHAKE_DISTANCE, duration: SHAKE_STEP_DURATION })
      .to(el, { x: 0, duration: SHAKE_STEP_DURATION })
  })
}

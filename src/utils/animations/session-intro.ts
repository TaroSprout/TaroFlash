import { gsap } from 'gsap'
import { emitSfx } from '@/sfx/bus'

const COVER_RISE = 60
const COVER_DURATION = 0.1
// Hold the card hidden until the modal's pop-in (~0.13s) has settled.
const COVER_DELAY = 0.15

/**
 * Cover-card entrance, driven by a Vue `<transition>` so the hidden state lands
 * before the element is ever painted (no mount-time flash). Pair these as the
 * transition's `@before-enter` and `@enter` hooks.
 *
 * `beforeEnter` runs before Vue inserts the element — that's what makes it
 * flash-proof; `enter` rises it in after the modal's pop has settled.
 */
export function coverCardBeforeEnter(el: HTMLElement) {
  gsap.set(el, { opacity: 0, y: COVER_RISE })
}

export function coverCardEnter(el: HTMLElement, done: () => void) {
  return gsap.to(el, {
    opacity: 1,
    y: 0,
    duration: COVER_DURATION,
    delay: COVER_DELAY,
    ease: 'power2.out',
    clearProps: 'transform,opacity',
    onStart: () => emitSfx('slide_up'),
    onComplete: done
  })
}

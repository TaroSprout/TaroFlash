import { gsap } from 'gsap'
import { emitSfx } from '@/sfx/bus'

const COVER_RISE = 60
const COVER_DURATION = 0.1
// Hold the card hidden until the modal's pop-in (~0.13s) has settled.
const COVER_DELAY = 0.15

/**
 * Raises the cover card into a session that's just opened.
 *
 * Wire as a transition's `@before-enter` and `@enter`, never imperatively on
 * mount — hiding the card has to happen before it is ever painted, or it
 * flashes at full size first.
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

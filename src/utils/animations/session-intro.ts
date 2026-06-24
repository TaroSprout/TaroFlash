import { gsap } from 'gsap'
import { emitSfx } from '@/sfx/bus'

const SETTLE_DURATION = 0.4
const COVER_SCALE = 1.25
const COVER_RISE = 60
const COVER_DURATION = 0.1
// Hold the card hidden until the modal's pop-in (~0.13s) has settled.
const COVER_DELAY = 0.15

/** Vertical gap between the title's header slot and the progress bar's centre. */
function offsetToProgress(title: HTMLElement, progress: HTMLElement) {
  const t = title.getBoundingClientRect()
  const p = progress.getBoundingClientRect()
  return p.top + p.height / 2 - (t.top + t.height / 2)
}

/**
 * Pre-session framing: drop the deck title down onto the (hidden) progress slot
 * and scale it up a touch, so the cover doesn't leave an awkward gap between the
 * header and the card. Measured relative to current layout, so it's immune to
 * the modal's own enter transform.
 */
export function placeTitleOnProgress(title: HTMLElement, progress: HTMLElement) {
  gsap.set(title, { y: offsetToProgress(title, progress), scale: COVER_SCALE })
  gsap.set(progress, { opacity: 0 })
}

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

/**
 * On session start, slide the title back up into the header and fade the
 * progress bar in where the title was sitting.
 */
export function settleStudyingChrome(title: HTMLElement, progress: HTMLElement) {
  gsap.to(title, {
    y: 0,
    scale: 1,
    duration: SETTLE_DURATION,
    ease: 'power2.out',
    clearProps: 'transform'
  })
  gsap.to(progress, {
    opacity: 1,
    duration: SETTLE_DURATION,
    ease: 'power2.out',
    clearProps: 'opacity'
  })
}

import { gsap } from 'gsap'

const ENTER_SETTLE_DELAY = 0.033

/**
 * Enter tweens settle on an identity transform, which gsap leaves inline as
 * `transform: translate(0px, 0px)`. Visually a no-op, but any non-none
 * transform (or filter) makes the element a containing block for `position:
 * fixed` descendants — so a settled modal captures the popovers inside it and
 * its own `overflow` clips them. Hand the resting state back to CSS instead.
 */
const CLEAR_TRANSFORM = { clearProps: 'transform' } as const

export function slideUpFadeIn(el: Element, done: () => void) {
  gsap.set(el, { translateY: '200px', opacity: 0 })
  gsap.to(el, {
    translateY: 0,
    opacity: 1,
    duration: 0.2,
    delay: ENTER_SETTLE_DELAY,
    ease: 'expo.out',
    ...CLEAR_TRANSFORM,
    onComplete: done
  })
}

export function slideDownFadeOut(el: Element, done: () => void) {
  gsap.to(el, {
    translateY: '200px',
    opacity: 0,
    duration: 0.2,
    ease: 'expo.out',
    onComplete: done
  })
}

export function slideUpFromEdge(el: Element, done: () => void) {
  gsap.set(el, { translateY: '100%' })
  gsap.to(el, {
    translateY: 0,
    duration: 0.2,
    delay: ENTER_SETTLE_DELAY,
    ease: 'expo.out',
    ...CLEAR_TRANSFORM,
    onComplete: done
  })
}

export function slideDownToEdge(el: Element, done: () => void) {
  gsap.to(el, { translateY: '100%', duration: 0.2, ease: 'expo.out', onComplete: done })
}

export function springScaleIn(el: Element, done: () => void) {
  gsap.set(el, { scale: 0.8, opacity: 0 })
  gsap.to(el, {
    scale: 1,
    opacity: 1,
    duration: 0.1,
    delay: ENTER_SETTLE_DELAY,
    ease: 'back.out(1.7)',
    ...CLEAR_TRANSFORM,
    onComplete: done
  })
}

export function scaleFadeOut(el: Element, done: () => void) {
  gsap.to(el, { scale: 0.8, opacity: 0, duration: 0.2, ease: 'expo.out', onComplete: done })
}

const RECEDE_DURATION = 0.4
const RECEDE_SCALE = 0.9
const RECEDE_TRANSLATE_Y = '60px'

/**
 * Dials back a modal that a new modal just opened on top of, as if a shadow fell over it.
 * Pinned-to-bottom sheets (tablet/sheet mode) nudge down instead of scaling, since scaling
 * a bottom-anchored modal reads as shrinking off-anchor rather than receding.
 */
export function recedeModal(el: Element, is_pinned: boolean) {
  gsap.set(el, { filter: 'brightness(1) blur(0px)' })
  gsap.to(el, {
    ...(is_pinned ? { translateY: RECEDE_TRANSLATE_Y } : { scale: RECEDE_SCALE }),
    filter: 'brightness(0.8) blur(2px)',
    duration: RECEDE_DURATION,
    ease: 'expo.out'
  })
}

/**
 * Restores a modal to full prominence once the modal above it has closed.
 *
 * Clears the filter alongside the transform — a settled `brightness(1)
 * blur(0px)` is as much a containing block as a settled `translate(0, 0)`, so
 * leaving it behind re-traps this modal's popovers the moment a nested modal
 * (an alert, a prompt) has come and gone.
 */
export function restoreModal(el: Element, is_pinned: boolean) {
  gsap.to(el, {
    ...(is_pinned ? { translateY: 0 } : { scale: 1 }),
    filter: 'brightness(1) blur(0px)',
    duration: RECEDE_DURATION,
    ease: 'expo.out',
    clearProps: 'transform,filter'
  })
}

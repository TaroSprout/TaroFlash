import { gsap } from 'gsap'

const ENTER_SETTLE_DELAY = 0.033

export function slideUpFadeIn(el: Element, done: () => void) {
  gsap.set(el, { translateY: '200px', opacity: 0 })
  gsap.to(el, {
    translateY: 0,
    opacity: 1,
    duration: 0.2,
    delay: ENTER_SETTLE_DELAY,
    ease: 'expo.out',
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
    ease: 'expo.out',
    pointerEvents: 'none'
  })
}

/** Restores a modal to full prominence once the modal above it has closed. */
export function restoreModal(el: Element, is_pinned: boolean) {
  gsap.set(el, { pointerEvents: 'auto' })
  gsap.to(el, {
    ...(is_pinned ? { translateY: 0 } : { scale: 1 }),
    filter: 'brightness(1) blur(0px)',
    duration: RECEDE_DURATION,
    ease: 'expo.out'
  })
}

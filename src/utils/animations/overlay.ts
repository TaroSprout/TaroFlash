import { gsap } from 'gsap'

const ENTER_SETTLE_DELAY = 0.033
const ENTER_DURATION = 0.2
const POPUP_ENTER_DURATION = 0.1
const LEAVE_DURATION = 0.2

/**
 * Enter tweens settle on an identity transform, which gsap leaves inline as
 * `transform: translate(0px, 0px)`. Visually a no-op, but any non-none
 * transform makes the element a containing block for `position: fixed`
 * descendants — so a settled overlay captures the popovers inside it and its
 * own `overflow` clips them. Hand the resting state back to CSS instead.
 */
const CLEAR_TRANSFORM = { clearProps: 'transform' } as const

type OverlayMode = 'dialog' | 'popup'

/** `data-overlay-mode` stamped by the surface; anything but `popup` is a dialog. */
function readMode(el: HTMLElement): OverlayMode {
  return el.dataset.overlayMode === 'popup' ? 'popup' : 'dialog'
}

/**
 * True when the CSS downgrade variant has painted the sheet marker onto this
 * element. Read from computed style so the timeline choice tracks the exact
 * same `--breakpoint-*` tokens the `overlay-downgrade` variant keys off.
 */
function isDowngraded(el: HTMLElement): boolean {
  return getComputedStyle(el).getPropertyValue('--overlay-downgraded').trim() === '1'
}

function slideUpFadeIn(el: HTMLElement, done: () => void) {
  gsap.set(el, { translateY: '200px', opacity: 0 })
  gsap.to(el, {
    translateY: 0,
    opacity: 1,
    duration: ENTER_DURATION,
    delay: ENTER_SETTLE_DELAY,
    ease: 'expo.out',
    ...CLEAR_TRANSFORM,
    onComplete: done
  })
}

function slideDownFadeOut(el: HTMLElement, done: () => void) {
  gsap.to(el, {
    translateY: '200px',
    opacity: 0,
    duration: LEAVE_DURATION,
    ease: 'expo.out',
    onComplete: done
  })
}

function slideUpFromEdge(el: HTMLElement, done: () => void) {
  gsap.set(el, { translateY: '100%' })
  gsap.to(el, {
    translateY: 0,
    duration: ENTER_DURATION,
    delay: ENTER_SETTLE_DELAY,
    ease: 'expo.out',
    ...CLEAR_TRANSFORM,
    onComplete: done
  })
}

function slideDownToEdge(el: HTMLElement, done: () => void) {
  gsap.to(el, { translateY: '100%', duration: LEAVE_DURATION, ease: 'expo.out', onComplete: done })
}

function springScaleIn(el: HTMLElement, done: () => void) {
  gsap.set(el, { scale: 0.8, opacity: 0 })
  gsap.to(el, {
    scale: 1,
    opacity: 1,
    duration: POPUP_ENTER_DURATION,
    delay: ENTER_SETTLE_DELAY,
    ease: 'back.out(1.7)',
    ...CLEAR_TRANSFORM,
    onComplete: done
  })
}

function scaleFadeOut(el: HTMLElement, done: () => void) {
  gsap.to(el, {
    scale: 0.8,
    opacity: 0,
    duration: LEAVE_DURATION,
    ease: 'expo.out',
    onComplete: done
  })
}

/**
 * Play an overlay's enter animation, dispatching on `data-overlay-mode`.
 * Dialogs slide-and-fade, or rise from the bottom edge when the downgrade
 * marker is set (sheet layout); popups spring-scale in. Resolves `done` from
 * gsap's `onComplete`.
 */
export function playEnter(el: HTMLElement, done: () => void) {
  if (readMode(el) === 'popup') return springScaleIn(el, done)
  if (isDowngraded(el)) return slideUpFromEdge(el, done)
  return slideUpFadeIn(el, done)
}

/**
 * Play an overlay's leave animation — the inverse of `playEnter`, dispatched
 * the same way. Resolves `done` from gsap's `onComplete`.
 */
export function playLeave(el: HTMLElement, done: () => void) {
  if (readMode(el) === 'popup') return scaleFadeOut(el, done)
  if (isDowngraded(el)) return slideDownToEdge(el, done)
  return slideDownFadeOut(el, done)
}

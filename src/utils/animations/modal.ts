import { gsap } from 'gsap'
import { defineMotion, motion } from '@/utils/motion/driver'

const ENTER_SETTLE_DELAY = 0.033

// Spread into every tween that settles visible, or the modal traps its own
// popovers. →[K:settled-transform-traps-overlays]
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

const DIALOG_RISE = '200px' // structural geometry, not a vocabulary travel token
const SHEET_TRAVEL = '100%' // structural geometry, not a vocabulary travel token
const POPUP_SCALE = 0.8 // structural geometry, not a vocabulary travel token

export const dialogEnterMotion = defineMotion({
  from: { translateY: DIALOG_RISE, opacity: 0 },
  to: { translateY: 0, opacity: 1 },
  duration: 200,
  ease: 'out-strong',
  delay: ENTER_SETTLE_DELAY,
  clearOnComplete: true
})

export const dialogLeaveMotion = defineMotion({
  to: { translateY: DIALOG_RISE, opacity: 0 },
  duration: 200,
  ease: 'out-strong',
  interrupt: 'snap-complete'
})

export const sheetEnterMotion = defineMotion({
  from: { translateY: SHEET_TRAVEL },
  to: { translateY: 0 },
  duration: 200,
  ease: 'out-strong',
  delay: ENTER_SETTLE_DELAY,
  clearOnComplete: true
})

export const sheetLeaveMotion = defineMotion({
  to: { translateY: SHEET_TRAVEL },
  duration: 200,
  ease: 'out-strong',
  interrupt: 'snap-complete'
})

export const popupEnterMotion = defineMotion({
  from: { scale: POPUP_SCALE, opacity: 0 },
  to: { scale: 1, opacity: 1 },
  duration: 100,
  ease: 'spring',
  delay: ENTER_SETTLE_DELAY,
  clearOnComplete: true
})

export const popupLeaveMotion = defineMotion({
  to: { scale: POPUP_SCALE, opacity: 0 },
  duration: 200,
  ease: 'out-strong',
  interrupt: 'snap-complete'
})

const RECEDE_DURATION = 0.4
const RECEDE_SCALE = 0.9
const RECEDE_TRANSLATE_Y = '60px'

function recedeVars(is_pinned: boolean): gsap.TweenVars {
  return is_pinned ? { translateY: RECEDE_TRANSLATE_Y } : { scale: RECEDE_SCALE }
}

/**
 * Dials a modal's transform back when a new modal opens on top of it. Pinned-to-bottom
 * sheets (tablet/sheet mode) nudge down instead of scaling, since scaling a bottom-anchored
 * modal reads as shrinking off-anchor rather than receding.
 *
 * The dim/blur is a CSS `filter` transition keyed off `data-receded` on the host, not a
 * tween here — a GSAP `filter` tween repaints the blur on the main thread every frame.
 */
export function recedeModal(el: Element, is_pinned: boolean) {
  const recede = motion(
    (node, ctx) => {
      ctx.tl.to(node, {
        ...recedeVars(is_pinned),
        duration: RECEDE_DURATION,
        ease: 'expo.out',
        overwrite: 'auto'
      })
    },
    { clearOnComplete: false }
  )

  recede(el as HTMLElement)
}

/** Restores a modal's transform to full prominence once the modal above it has closed. */
export function restoreModal(el: Element, is_pinned: boolean) {
  const restore = motion(
    (node, ctx) => {
      ctx.tl.to(node, {
        ...(is_pinned ? { translateY: 0 } : { scale: 1 }),
        duration: RECEDE_DURATION,
        ease: 'expo.out',
        overwrite: 'auto'
      })
    },
    { clearOnComplete: true }
  )

  restore(el as HTMLElement)
}

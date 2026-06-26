import { gsap } from 'gsap'

const ENTER_DURATION = 0.3

/**
 * Reveal a freshly-added card row, growing it in from a collapsed top edge.
 * Driven imperatively (not a Vue Transition) because the editor list is
 * windowed: every row's slot is reserved up front, so a transition would fire
 * for rows scrolling into view too. The caller gates this to the one card it
 * just added, animating it within its reserved slot rather than reflowing the
 * list.
 */
export function expandListItemIn(el: HTMLElement) {
  gsap.from(el, {
    scaleY: 0,
    opacity: 0,
    duration: ENTER_DURATION,
    ease: 'power2.out',
    transformOrigin: 'center top',
    clearProps: 'all'
  })
}

const LIFT_SCALE = 1.03

/**
 * Pickup pop for a reorder drag: a quick scale up with a little overshoot that
 * settles to a held, slightly-lifted scale (the row reads as "picked up" for
 * the whole drag). Pair with `dropListItem` on release. Animates `scale` only —
 * no clearProps — so it composes with the row's reactive drag transform
 * (translate) and the held scale persists until the drop.
 */
export function liftListItem(el: HTMLElement) {
  gsap
    .timeline()
    .to(el, { scale: LIFT_SCALE * 1.02, duration: 0.09, ease: 'power2.out' })
    .to(el, { scale: LIFT_SCALE, duration: 0.12, ease: 'back.out(3)' })
}

/** Settle a lifted row back to rest on drop, then clear the inline scale. */
export function dropListItem(el: HTMLElement) {
  gsap.to(el, { scale: 1, duration: 0.15, ease: 'power2.out', clearProps: 'scale' })
}

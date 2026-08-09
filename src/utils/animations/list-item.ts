import { gsap } from 'gsap'

const ENTER_DURATION = 0.3

/**
 * Grows a newly added card row into view.
 *
 * Call it directly, on the one row that was just added — the editor list
 * reserves every row's space up front, so a transition would fire this for
 * rows merely scrolled past too.
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
 * Lifts a row as it's picked up for a reorder drag, holding it raised until
 * `dropListItem` puts it back.
 *
 * Deliberately leaves its scale behind — the row is still being dragged, and
 * clearing it would both drop the lift and wipe the drag's own offset.
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

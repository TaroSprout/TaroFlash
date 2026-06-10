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

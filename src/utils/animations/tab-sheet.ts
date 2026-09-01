import { gsap } from 'gsap'

const ENTER_DURATION = 0.18
// Also the deadline for anything a leaving tab put on screen elsewhere — the
// pane stays mounted for exactly this long, and slower exits get cut off.
export const TAB_LEAVE_DURATION = 0.22
const OFFSET = 16

/** Slide-and-fade the entering tab pane down into place from above. */
export function tabContentEnter(el: Element, done: () => void) {
  gsap.set(el, { y: -OFFSET, opacity: 0 })
  gsap.to(el, {
    y: 0,
    opacity: 1,
    duration: ENTER_DURATION,
    ease: 'expo.out',
    // Strip the transform once landed, or the tab traps its own popovers. →[K:settled-transform-traps-overlays]
    clearProps: 'transform,opacity',
    onComplete: done
  })
}

/** Slide-and-fade the leaving tab pane downward and out. */
export function tabContentLeave(el: Element, done: () => void) {
  gsap.to(el, {
    y: OFFSET,
    opacity: 0,
    duration: TAB_LEAVE_DURATION,
    ease: 'expo.in',
    onComplete: done
  })
}

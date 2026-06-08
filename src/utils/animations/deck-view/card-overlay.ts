import { gsap } from 'gsap'

const DURATION = 0.3
const DISTANCE = '100%'

// Lift the entering pane out of flow so it slides up *over* the outgoing pane
// (which still occupies the container and gives it height to slide across).
export function primeOverlayBelow(el: Element) {
  gsap.set(el, { position: 'absolute', inset: 0, zIndex: 1, translateY: DISTANCE })
}

export function slideOverlayUp(el: Element, done: () => void) {
  gsap.to(el, {
    translateY: 0,
    duration: DURATION,
    ease: 'expo.out',
    onComplete: done
  })
}

// Drop the entered pane back into normal flow so the page — not the pane —
// owns the scroll once the swap settles.
export function settleOverlay(el: Element) {
  gsap.set(el, { clearProps: 'position,inset,zIndex,transform' })
}

export function slideOverlayDown(el: Element, done: () => void) {
  gsap.to(el, {
    translateY: DISTANCE,
    duration: DURATION,
    ease: 'expo.out',
    onComplete: done
  })
}

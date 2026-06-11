import { gsap } from 'gsap'

const DURATION = 0.25
// Both panes share one easing/duration so they translate as a single rigid strip
// — the incoming panel reads as pushing the outgoing face off to the left.
const EASE = 'power2.inOut'

/**
 * Horizontal slide-over for swapping a card's whole face — the term translation
 * and the inline add-card panel. Wire on a single-child `<Transition>` whose
 * direct parent is `position: relative; overflow: hidden`.
 *
 * The entering pane stays in normal flow so it dictates the container's height
 * (and, in the footer, the height animation that follows it); the leaving pane
 * pins absolute and slides out to the left in lockstep, so the incoming pane
 * pushes the outgoing one over.
 */
export function cardSlideEnter(el: Element, done: () => void) {
  gsap.fromTo(
    el,
    { xPercent: 100 },
    { xPercent: 0, duration: DURATION, ease: EASE, clearProps: 'transform', onComplete: done }
  )
}

export function cardSlideLeave(el: Element, done: () => void) {
  const node = el as HTMLElement
  node.style.position = 'absolute'
  node.style.left = '0'
  node.style.right = '0'
  node.style.top = '0'
  gsap.to(node, { xPercent: -100, duration: DURATION, ease: EASE, onComplete: done })
}

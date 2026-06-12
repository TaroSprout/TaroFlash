import { gsap } from 'gsap'

const DURATION = 0.25
// Both panes share one easing/duration so they translate as a single rigid strip
// — the incoming pane reads as pushing the outgoing one over.
const EASE = 'power2.inOut'

export type SlideDirection = 'forward' | 'back'

/**
 * Horizontal push for swapping a card's whole face — the term translation and the
 * inline add-card panel. Wire the returned hooks on a single-child `<Transition>`
 * whose direct parent is `position: relative; overflow: hidden`.
 *
 * The entering pane stays in normal flow so it dictates the container's height
 * (and, in the footer, the height animation that follows it); the leaving pane
 * pins absolute and slides in lockstep, so the incoming pane pushes the outgoing
 * one off. `forward` pushes leftward (new pane from the right); `back` reverses
 * it (new pane from the left) so cancelling looks like the term card sliding back.
 */
export function cardSlideEnter(direction: SlideDirection) {
  const from = direction === 'forward' ? 100 : -100
  return (el: Element, done: () => void) => {
    gsap.fromTo(
      el,
      { xPercent: from },
      { xPercent: 0, duration: DURATION, ease: EASE, clearProps: 'transform', onComplete: done }
    )
  }
}

export function cardSlideLeave(direction: SlideDirection) {
  const to = direction === 'forward' ? -100 : 100
  return (el: Element, done: () => void) => {
    const node = el as HTMLElement
    node.style.position = 'absolute'
    node.style.left = '0'
    node.style.right = '0'
    node.style.top = '0'
    gsap.to(node, { xPercent: to, duration: DURATION, ease: EASE, onComplete: done })
  }
}

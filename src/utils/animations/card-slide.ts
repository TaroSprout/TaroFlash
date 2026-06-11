import { gsap } from 'gsap'

const DURATION = 0.25

/**
 * Horizontal slide-over for swapping a card's whole face — the term translation
 * and the inline add-card panel. Wire on a single-child `<Transition>` whose
 * direct parent is `position: relative; overflow: hidden`.
 *
 * The entering pane stays in normal flow so it dictates the container's height
 * (and, in the footer, the height animation that follows it); the leaving pane
 * pins absolute and slides out to the left as the new one slides in from the
 * right.
 */
export function cardSlideEnter(el: Element, done: () => void) {
  gsap.fromTo(
    el,
    { xPercent: 100 },
    {
      xPercent: 0,
      duration: DURATION,
      ease: 'power3.out',
      clearProps: 'transform',
      onComplete: done
    }
  )
}

export function cardSlideLeave(el: Element, done: () => void) {
  const node = el as HTMLElement
  node.style.position = 'absolute'
  node.style.left = '0'
  node.style.right = '0'
  node.style.top = '0'
  gsap.to(node, { xPercent: -100, duration: DURATION, ease: 'power3.in', onComplete: done })
}

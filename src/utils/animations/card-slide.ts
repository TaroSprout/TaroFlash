import { gsap } from 'gsap'

const DURATION = 0.25
// Keep both panes on one easing and duration — any difference and they drift
// apart instead of reading as one strip being pushed across.
const EASE = 'power2.inOut'

export type SlideDirection = 'forward' | 'back'

/**
 * Swaps a card's whole face by pushing the new one in against the old.
 *
 * Wire the hooks on a single-child `<Transition>` inside a `relative`,
 * `overflow-hidden` parent. Use `back` for anything that undoes a `forward` —
 * the reversed direction is what makes cancelling read as going back rather
 * than as another step onward.
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

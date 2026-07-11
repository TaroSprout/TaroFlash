import { gsap } from 'gsap'

const POP_IN_DURATION = 0.2
const POP_OUT_DURATION = 0.2

/** Reveal a freshly created deck thumbnail with a playful pop-in. */
export function popDeckIn(el: Element, done: () => void) {
  gsap.fromTo(
    el,
    { scale: 0.5, opacity: 0 },
    {
      scale: 1,
      opacity: 1,
      duration: POP_IN_DURATION,
      ease: 'back.out(2)',
      clearProps: 'all',
      onComplete: done
    }
  )
}

/** Shrink a removed deck thumbnail away. */
export function popDeckOut(el: Element, done: () => void) {
  gsap.to(el, {
    scale: 0.5,
    opacity: 0,
    duration: POP_OUT_DURATION,
    ease: 'power2.in',
    onComplete: done
  })
}

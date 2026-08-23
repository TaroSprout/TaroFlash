import { gsap } from 'gsap'

const POP_IN_DURATION = 0.2
const POP_OUT_DURATION = 0.2

/**
 * Pops a newly created deck into the grid.
 *
 * Pass the grid cell — the pop is applied one level in, because the cell is
 * already carrying its own placement. →[K:settled-transform-traps-overlays]
 */
export function popDeckIn(el: Element, done: () => void) {
  const target = el.firstElementChild ?? el

  gsap.fromTo(
    target,
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

/** Shrinks a removed deck away. Takes the grid cell, same as `popDeckIn`. */
export function popDeckOut(el: Element, done: () => void) {
  gsap.to(el.firstElementChild ?? el, {
    scale: 0.5,
    opacity: 0,
    duration: POP_OUT_DURATION,
    ease: 'power2.in',
    onComplete: done
  })
}

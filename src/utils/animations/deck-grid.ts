import { gsap } from 'gsap'

const POP_IN_DURATION = 0.2
const POP_OUT_DURATION = 0.2

const POP_IN_EVENT = 'deck-pop-in'
// Bounds the wait — the deck may be off-screen, or the grid may never mount at
// all, and neither should hang the caller.
const POP_IN_SIGNAL_TIMEOUT = 1000

/**
 * Pops a newly created deck into the grid, and announces when it has landed so
 * `waitForDeckPopIn` can resolve.
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
      onComplete: () => {
        done()
        el.dispatchEvent(
          new CustomEvent(POP_IN_EVENT, {
            bubbles: true,
            detail: { id: Number(el.getAttribute('data-deck-id')) }
          })
        )
      }
    }
  )
}

/** Resolves once a deck has finished popping in, or shortly after regardless. */
export function waitForDeckPopIn(id: number): Promise<void> {
  return new Promise((resolve) => {
    const timeout = window.setTimeout(cleanup, POP_IN_SIGNAL_TIMEOUT)

    function onPopIn(e: Event) {
      if ((e as CustomEvent).detail?.id !== id) return
      cleanup()
    }

    function cleanup() {
      window.clearTimeout(timeout)
      document.removeEventListener(POP_IN_EVENT, onPopIn)
      resolve()
    }

    document.addEventListener(POP_IN_EVENT, onPopIn)
  })
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

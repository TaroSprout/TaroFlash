import { gsap } from 'gsap'

const POP_IN_DURATION = 0.2
const POP_OUT_DURATION = 0.2

const POP_IN_EVENT = 'deck-pop-in'
// Safety net for waitForDeckPopIn callers in case the deck grid never mounts
// or animates the deck in question (e.g. it's off-screen) — bounded so a
// caller awaiting the signal can never hang indefinitely.
const POP_IN_SIGNAL_TIMEOUT = 1000

/**
 * Reveal a freshly created deck thumbnail with a playful pop-in. Also
 * broadcasts a `deck-pop-in` event (read by `waitForDeckPopIn`) once the
 * animation completes, keyed off the element's `data-deck-id` attribute.
 */
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

/**
 * Resolve once the given deck's grid pop-in animation finishes (or after a
 * short timeout if it never fires — the grid may not be mounted).
 */
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

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Delay between consecutive card flips as the features row reveals.
const FEATURE_FLIP_STAGGER = 0.12

/**
 * Flip the feature cards in a staggered sequence as `trigger` enters and leaves
 * the viewport: cover→front on the way down, front→cover when scrolled back up.
 * `setSide` is called per card on a GSAP-scheduled timeline; the actual flip is
 * the card's own transition reacting to the side change.
 *
 * Returns the ScrollTrigger so the caller can `kill()` it on unmount.
 */
export function createFeatureReveal(
  trigger: Element,
  count: number,
  setSide: (index: number, side: CardSide) => void
): ScrollTrigger {
  return ScrollTrigger.create({
    trigger,
    start: 'top center',
    onEnter: () => stagger(count, (index) => setSide(index, 'front')),
    onLeaveBack: () => stagger(count, (index) => setSide(index, 'cover'))
  })
}

/** Run `apply(index)` for each card, spaced by the flip stagger. */
function stagger(count: number, apply: (index: number) => void) {
  for (let index = 0; index < count; index++) {
    gsap.delayedCall(index * FEATURE_FLIP_STAGGER, () => apply(index))
  }
}

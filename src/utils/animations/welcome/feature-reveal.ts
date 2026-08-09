import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Delay between consecutive cards as the row reveals.
const FEATURE_STAGGER = 0.12

// The band of the screen a row has to reach to come alive. Deliberately
// lopsided — cards stay awake a little longer on the way down.
const BAND_TOP = '25%'
const BAND_BOTTOM = '60%'

/**
 * Wakes a group of welcome-page cards one after another as they scroll into
 * the middle of the screen, and puts them back to sleep on the way out.
 *
 * @param indices - The cards this trigger owns, woken in the order given.
 *   How the page is grouped varies by screen size.
 * @param setActive - What waking means here: turning a card over, or
 *   revealing one from a stack.
 * @returns The trigger, which the caller must kill on unmount.
 */
export function createFeatureReveal(
  trigger: Element,
  indices: number[],
  setActive: (index: number, active: boolean) => void
): ScrollTrigger {
  const apply = (active: boolean) => stagger(indices, (index) => setActive(index, active))

  return ScrollTrigger.create({
    trigger,
    start: `top ${BAND_BOTTOM}`,
    end: `bottom ${BAND_TOP}`,
    onEnter: () => apply(true),
    onLeave: () => apply(false),
    onEnterBack: () => apply(true),
    onLeaveBack: () => apply(false)
  })
}

/** Run `apply(index)` for each controlled card, spaced by the stagger. */
function stagger(indices: number[], apply: (index: number) => void) {
  indices.forEach((index, order) => {
    gsap.delayedCall(order * FEATURE_STAGGER, () => apply(index))
  })
}

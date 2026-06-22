import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Delay between consecutive cards as the row reveals.
const FEATURE_STAGGER = 0.12

// Cards are active only while the row overlaps this vertical band of the viewport
// (measured from the top). Outside it — above or below — they go inactive, giving
// a deadzone at the top and bottom of the screen. The band is intentionally
// taller above center so cards linger active a little longer when scrolling down.
const BAND_TOP = '25%'
const BAND_BOTTOM = '60%'

/**
 * Drive a set of feature cards active/inactive in a staggered sequence as
 * `trigger` passes through the central band of the viewport: active on entry,
 * inactive on exit, in either scroll direction. `indices` are the card indices
 * this trigger controls (the whole row on desktop, one grid row on tablet, the
 * whole stack on mobile); they fire in array order. `setActive` is called per
 * card on a GSAP-scheduled timeline — the caller decides what "active" means
 * (flip cover→front, or reveal a stacked card).
 *
 * Returns the ScrollTrigger so the caller can `kill()` it on unmount.
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

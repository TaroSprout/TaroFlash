import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Delay between consecutive card flips as the features row reveals.
const FEATURE_FLIP_STAGGER = 0.12

// Cards show their front only while the row overlaps this vertical band of the
// viewport (measured from the top). Outside it — above or below — they stay on
// their cover, giving a deadzone at the top and bottom of the screen. The band
// is intentionally taller above center so cards linger on the front a little
// longer before flipping back as you scroll down.
const BAND_TOP = '25%'
const BAND_BOTTOM = '60%'

/**
 * Flip the feature cards in a staggered sequence as `trigger` passes through the
 * central band of the viewport: cover→front on entry, front→cover on exit, in
 * either scroll direction. `setSide` is called per card on a GSAP-scheduled
 * timeline; the actual flip is the card's own transition reacting to the change.
 *
 * Returns the ScrollTrigger so the caller can `kill()` it on unmount.
 */
export function createFeatureReveal(
  trigger: Element,
  count: number,
  setSide: (index: number, side: CardSide) => void
): ScrollTrigger {
  const flip = (side: CardSide) => stagger(count, (index) => setSide(index, side))

  return ScrollTrigger.create({
    trigger,
    start: `top ${BAND_BOTTOM}`,
    end: `bottom ${BAND_TOP}`,
    onEnter: () => flip('front'),
    onLeave: () => flip('cover'),
    onEnterBack: () => flip('front'),
    onLeaveBack: () => flip('cover')
  })
}

/** Run `apply(index)` for each card, spaced by the flip stagger. */
function stagger(count: number, apply: (index: number) => void) {
  for (let index = 0; index < count; index++) {
    gsap.delayedCall(index * FEATURE_FLIP_STAGGER, () => apply(index))
  }
}

import { gsap } from 'gsap'

// A page turn settles a touch slower than a UI tick — long enough to read as
// paper sliding, short enough not to lag the swipe. Eased out so it decelerates
// into place after the finger lets go.
const SETTLE_DURATION = 0.34

/**
 * Slide the page track to `x` px and resolve when it lands. Kills any settle
 * already running on the track so a fast second swipe redirects mid-flight rather
 * than queueing behind the first.
 */
export function settlePageTrack(track: HTMLElement, x: number): Promise<void> {
  gsap.killTweensOf(track)
  return new Promise((resolve) => {
    gsap.to(track, {
      x,
      duration: SETTLE_DURATION,
      ease: 'power3.out',
      onComplete: resolve
    })
  })
}

/** Place the track at `x` with no animation — used to re-center after a page commit. */
export function setPageTrack(track: HTMLElement, x: number) {
  gsap.set(track, { x })
}

const BAND_DURATION = 0.28

export function resizeBand(band: HTMLElement, height: number): Promise<void> {
  gsap.killTweensOf(band)
  return new Promise((resolve) => {
    gsap.to(band, {
      height,
      duration: BAND_DURATION,
      ease: 'power2.out',
      onComplete: resolve
    })
  })
}

export function setBand(band: HTMLElement, height: number) {
  gsap.set(band, { height })
}

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// The deck's active zone, as viewport positions measured from the top: the first
// card activates as the row's top reaches ZONE_BOTTOM, and the last deactivates
// once it reaches ZONE_TOP. Using viewport % (not pixels) keeps the pacing
// consistent across screen sizes and browsers.
const ZONE_BOTTOM = 70
const ZONE_TOP = -15

/** Viewport-% threshold for each of `count` triggers, evenly spanning the zone. */
function zonePositions(count: number): number[] {
  return Array.from(
    { length: count },
    (_, index) => ZONE_BOTTOM + ((ZONE_TOP - ZONE_BOTTOM) * index) / (count - 1)
  )
}

/**
 * Mobile: spread `count` ScrollTriggers evenly across the deck's active zone
 * (ZONE_BOTTOM → ZONE_TOP of the viewport) so exactly one card is active while the
 * row crosses the zone, cycling as it scrolls. `setActive(index, active)` is called
 * per threshold as the row's top crosses it (and reverses scrolling back up); the
 * caller maps that to which card is active. Returns a teardown.
 */
export function createStackReveal(
  trigger: Element,
  count: number,
  setActive: (index: number, active: boolean) => void
): () => void {
  const triggers = zonePositions(count).map((position, index) =>
    ScrollTrigger.create({
      trigger,
      start: `top ${position}%`,
      onEnter: () => setActive(index, true),
      onLeaveBack: () => setActive(index, false)
    })
  )

  return () => triggers.forEach((instance) => instance.kill())
}

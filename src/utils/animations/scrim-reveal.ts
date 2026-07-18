import { gsap } from 'gsap'

const DURATION = 0.32
const HIDDEN_SCALE = 0.94

/**
 * Swaps a panel's scrim for the content beneath it with a bubble pop — the
 * outgoing layer shrinks away while the incoming one overshoots back to full
 * size.
 *
 * Both layers stay mounted and only opacity/scale change, so the panel keeps
 * the height its content demands whichever layer is showing. Scale is a
 * transform, so it doesn't feed back into layout either.
 */
export function popScrimReveal(scrim: Element, content: Element[], revealed: boolean) {
  const incoming = revealed ? content : [scrim]
  const outgoing = revealed ? [scrim] : content

  const timeline = gsap.timeline()

  timeline.to(
    outgoing,
    { opacity: 0, scale: HIDDEN_SCALE, duration: DURATION * 0.6, ease: 'power2.in' },
    0
  )
  timeline.fromTo(
    incoming,
    { opacity: 0, scale: HIDDEN_SCALE },
    { opacity: 1, scale: 1, duration: DURATION, ease: 'back.out(1.7)' },
    DURATION * 0.35
  )

  return timeline
}

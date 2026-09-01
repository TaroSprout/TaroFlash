import { gsap } from 'gsap'

const DURATION = 0.32
const HIDDEN_SCALE = 0.94

type PopScrimRevealOptions = {
  // Collapse the panel down to the cover instead of holding the fields' full
  // height. For narrow layouts, where the reserved space costs more than the
  // steady height is worth.
  collapse?: boolean
}

/**
 * Swaps a panel's cover for the fields beneath it with a bubble pop.
 *
 * Both layers stay mounted in one grid cell, so pass the badge's contents
 * rather than the badge itself — the notch in the panel's top edge is permanent
 * and only empties out.
 */
export function popScrimReveal(
  scrim: HTMLElement,
  badge_content: HTMLElement,
  fields: HTMLElement,
  revealed: boolean,
  { collapse = false }: PopScrimRevealOptions = {}
) {
  const incoming = revealed ? [badge_content, fields] : [scrim]
  const outgoing = revealed ? [scrim] : [badge_content, fields]

  const timeline = gsap.timeline()

  timeline.to(
    outgoing,
    { opacity: 0, scale: HIDDEN_SCALE, duration: DURATION * 0.6, ease: 'power2.in' },
    0
  )
  timeline.fromTo(
    incoming,
    { opacity: 0, scale: HIDDEN_SCALE },
    {
      opacity: 1,
      scale: 1,
      duration: DURATION,
      ease: 'back.out(1.7)',
      // Drop the settled scale, or the fields' dropdowns get trapped. →[K:settled-transform-traps-overlays]
      clearProps: 'transform'
    },
    DURATION * 0.35
  )

  if (!collapse) return timeline

  const natural_height = fields.scrollHeight

  gsap.set(fields, { overflow: 'hidden' })
  timeline.fromTo(
    fields,
    { height: revealed ? 0 : natural_height },
    {
      height: revealed ? natural_height : 0,
      duration: DURATION,
      ease: 'power2.inOut',
      onComplete: () => {
        fields.style.height = ''
        fields.style.overflow = ''
      }
    },
    0
  )

  return timeline
}

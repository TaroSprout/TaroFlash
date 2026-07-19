import { gsap } from 'gsap'

const DURATION = 0.32
const HIDDEN_SCALE = 0.94

type PopScrimRevealOptions = {
  // Also tween the fields' height, so the panel collapses to the scrim rather
  // than holding the full height. For narrow layouts, where reserving space for
  // hidden content costs more than the stable height is worth.
  collapse?: boolean
}

/**
 * Swaps a panel's scrim for the fields beneath it with a bubble pop — the
 * outgoing layer shrinks away while the incoming one overshoots back to full
 * size.
 *
 * The badge's own pill never moves — only its contents ride along with the
 * fields, so the notch in the panel's top edge is permanent and just empties
 * out while the fields are hidden.
 *
 * Both layers stay mounted and share a grid cell, so the panel is always as
 * tall as the taller one. Without `collapse` that's the fields whichever layer
 * is showing, which keeps the panel's height stable; with it the fields tween
 * to zero and the scrim sets the height instead.
 *
 * Inline height/overflow/transform are cleared once the tween lands so the
 * resting state is owned by the caller's classes — otherwise a collapse would
 * survive a resize into a layout that never collapses, and a settled transform
 * would keep trapping the revealed layer's popovers in its stacking context.
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
      // A settled `scale: 1` is visually a no-op but not a layout one — any
      // non-none transform makes the element a containing block for fixed
      // descendants and a stacking context of its own, which traps the slotted
      // fields' dropdown menus underneath later siblings. Drop it once landed;
      // the outgoing layer keeps its inline transform, since that's what's
      // holding it hidden.
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

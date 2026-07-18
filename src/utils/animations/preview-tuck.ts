import { gsap } from 'gsap'

const HALF_TURN_DURATION = 0.14
const FLIP_PERSPECTIVE = 800

const TUCKED_POSE = { y: -70, scale: 0.8 }
const RESTING_POSE = { y: 0, scale: 1 }

type PreviewPose = typeof TUCKED_POSE

/**
 * Flips the pinned preview a full turn while it lifts and eases back a touch,
 * so it reads as the card tucking in behind the content pane with its top edge
 * still poking into the sheet header.
 *
 * @param onEdgeOn - fires at 90°, the frame where the card is edge-on and
 * invisible, so the caller can swap its stacking layer without a visible pop.
 */
export function tuckPinnedPreview(el: HTMLElement, onEdgeOn: () => void) {
  return flipToPose(el, TUCKED_POSE, onEdgeOn)
}

/** Reverse of {@link tuckPinnedPreview} — flips the card back out to its resting pose. */
export function untuckPinnedPreview(el: HTMLElement, onEdgeOn: () => void) {
  return flipToPose(el, RESTING_POSE, onEdgeOn)
}

/** Drops the preview straight into a pose with no animation, for the initial mount. */
export function snapPinnedPreview(el: HTMLElement, tucked: boolean) {
  if (tucked) gsap.set(el, { ...TUCKED_POSE, transformPerspective: FLIP_PERSPECTIVE })
  else gsap.set(el, { clearProps: 'transform' })
}

function flipToPose(el: HTMLElement, pose: PreviewPose, onEdgeOn: () => void) {
  const tl = gsap.timeline()

  // Perspective has to be baked into the inline transform before the first
  // rotate, or the opening frame renders as a flat scaleX squish instead of a
  // turn — same first-flip jank the cover carousel works around.
  tl.set(el, { transformPerspective: FLIP_PERSPECTIVE })
  tl.to(el, { rotateY: 90, duration: HALF_TURN_DURATION, ease: 'power2.in', onComplete: onEdgeOn })
  tl.set(el, { rotateY: -90 })
  tl.to(el, { rotateY: 0, duration: HALF_TURN_DURATION, ease: 'power2.out' })

  // The travel runs across both halves rather than after them, so the card is
  // already drifting away as it turns rather than turning then sliding.
  tl.to(el, { ...pose, duration: HALF_TURN_DURATION * 2, ease: 'power2.inOut' }, 0)

  return new Promise<void>((resolve) => {
    tl.eventCallback('onComplete', resolve)
  })
}

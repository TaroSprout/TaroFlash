import { gsap } from 'gsap'

const HALF_TURN_DURATION = 0.1
const FLIP_PERSPECTIVE = 800

const TUCKED_POSE = { y: -90, scale: 0.85 }
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

  // Set the perspective before the first rotate, never alongside it — the
  // opening frame renders as a flat squish otherwise.
  tl.set(el, { transformPerspective: FLIP_PERSPECTIVE })
  tl.to(el, { rotateY: 90, duration: HALF_TURN_DURATION, ease: 'power2.in', onComplete: onEdgeOn })
  tl.set(el, { rotateY: -90 })
  tl.to(el, { rotateY: 0, duration: HALF_TURN_DURATION, ease: 'power2.out' })

  // Keep the travel spanning both halves of the turn — split after it, the
  // card reads as turning and then sliding, two moves instead of one.
  tl.to(el, { ...pose, duration: HALF_TURN_DURATION * 2, ease: 'power2.inOut' }, 0)

  return new Promise<void>((resolve) => {
    tl.eventCallback('onComplete', resolve)
  })
}

import gsap from 'gsap'

// Short enough to feel instant under the finger, with a slight overshoot so the
// bubble pops to confirm the long-press armed.
const DURATION = 0.16

/** Pop the selection-preview bubble in when the touch long-press arms. */
export function popInPreview(el: Element, onComplete?: () => void) {
  gsap.fromTo(
    el,
    { opacity: 0, scale: 0.8 },
    { opacity: 1, scale: 1, duration: DURATION, ease: 'back.out(2)', onComplete }
  )
}

/** Fade the selection-preview bubble out when the selection commits or cancels. */
export function popOutPreview(el: Element, onComplete?: () => void) {
  gsap.to(el, { opacity: 0, scale: 0.8, duration: DURATION, ease: 'power1.in', onComplete })
}

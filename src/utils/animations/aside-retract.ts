import { gsap } from 'gsap'

const DURATION = 0.2
const EASE = 'power2.inOut'

/**
 * Slides the aside out past the right edge, where the sheet's overflow clips it.
 *
 * The track it occupies collapses instantly rather than over the tween — a
 * negative margin animated in step with the slide would reflow the sibling tab
 * content on every frame. An opposing `x` cancels the jump that instant
 * collapse would otherwise cause, so only the tween moves anything on screen.
 * Callers are expected to run this while the tab outlet is empty, so the
 * reflow itself is never seen.
 */
export function retractAside(el: HTMLElement) {
  return new Promise<void>((resolve) => {
    const width = el.offsetWidth

    gsap.set(el, { marginRight: -width, x: -width })
    gsap.to(el, { x: 0, autoAlpha: 0, duration: DURATION, ease: EASE, onComplete: resolve })
  })
}

/**
 * Reverse of {@link retractAside} — slides the aside back in, then hands its
 * track back. Restoring the margin shifts the aside left by exactly what
 * dropping the `x` offset shifts it right, so the final swap back into flow
 * costs no visible movement.
 */
export function restoreAside(el: HTMLElement) {
  return new Promise<void>((resolve) => {
    gsap.to(el, {
      x: -el.offsetWidth,
      autoAlpha: 1,
      duration: DURATION,
      ease: EASE,
      onComplete: () => {
        gsap.set(el, { clearProps: 'transform,visibility,opacity,marginRight' })
        resolve()
      }
    })
  })
}

/** Drops the aside straight into a pose with no animation, for the initial mount. */
export function snapAside(el: HTMLElement, retracted: boolean) {
  if (retracted) gsap.set(el, { marginRight: -el.offsetWidth, x: 0, autoAlpha: 0 })
  else gsap.set(el, { clearProps: 'transform,visibility,opacity,marginRight' })
}

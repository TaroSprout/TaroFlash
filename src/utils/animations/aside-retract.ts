import { gsap } from 'gsap'

const DURATION = 0.2
const EASE = 'power2.inOut'

/**
 * Slides the aside off the right edge and hands its column back.
 *
 * Run this while the tab beside it is empty. The column collapses in one step
 * rather than over the slide — animating it would reflow the neighbouring
 * content on every frame — and that step is only invisible if there's nothing
 * there to jump.
 */
export function retractAside(el: HTMLElement) {
  return new Promise<void>((resolve) => {
    const width = el.offsetWidth

    gsap.set(el, { marginRight: -width, x: -width })
    gsap.to(el, { x: 0, autoAlpha: 0, duration: DURATION, ease: EASE, onComplete: resolve })
  })
}

/** Reverse of {@link retractAside} — slides the aside back in and reclaims its column. */
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

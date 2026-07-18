import { gsap } from 'gsap'

const DURATION = 0.2
const EASE = 'power2.inOut'

/**
 * Slides the aside out past the right edge while collapsing the track it
 * occupies, so its `flex-1` sibling reflows to full width as it leaves.
 * Negative margin does the collapsing — animating `width` would squash the
 * aside's own contents on the way out.
 */
export function retractAside(el: HTMLElement) {
  return new Promise<void>((resolve) => {
    gsap.to(el, {
      xPercent: 100,
      autoAlpha: 0,
      marginRight: -el.offsetWidth,
      duration: DURATION,
      ease: EASE,
      onComplete: resolve
    })
  })
}

/** Reverse of {@link retractAside} — slides the aside back in and reclaims its track. */
export function restoreAside(el: HTMLElement) {
  return new Promise<void>((resolve) => {
    gsap.to(el, {
      xPercent: 0,
      autoAlpha: 1,
      marginRight: 0,
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
  if (retracted) gsap.set(el, { xPercent: 100, autoAlpha: 0, marginRight: -el.offsetWidth })
  else gsap.set(el, { clearProps: 'transform,visibility,opacity,marginRight' })
}

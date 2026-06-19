import { gsap } from 'gsap'

const DURATION = 0.25

export type CarouselDirection = 'next' | 'prev'

/**
 * Slide the tape element by one card step.
 * For 'next': tape is already at x=0 with the new card appended on the right → animate to -step.
 * For 'prev': tape is already at x=0 with the new card prepended on the left → set to -step, animate to 0.
 */
export function carouselSlide(
  el: HTMLElement,
  direction: CarouselDirection,
  stepPx: number
): Promise<void> {
  const to = direction === 'next' ? -stepPx : 0
  if (direction === 'prev') gsap.set(el, { x: -stepPx })
  return new Promise((resolve) =>
    gsap.to(el, {
      x: to,
      duration: DURATION,
      ease: 'power2.inOut',
      onComplete: () => {
        gsap.set(el, { x: 0 })
        resolve()
      }
    })
  )
}

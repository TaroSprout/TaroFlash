import { gsap } from 'gsap'

const SLIDE_DURATION = 0.2

export function slideScroller(scroller: HTMLElement, to: number, onComplete: () => void) {
  const proxy = { x: scroller.scrollLeft }

  gsap.killTweensOf(proxy)
  gsap.to(proxy, {
    x: to,
    duration: SLIDE_DURATION,
    ease: 'power2.out',
    onUpdate: () => (scroller.scrollLeft = proxy.x),
    onComplete
  })
}

import { gsap } from 'gsap'

const SLIDE_DURATION = 0.2

export function slideScroller(
  scroller: HTMLElement,
  to: number,
  onComplete: () => void
): () => void {
  const proxy = { x: scroller.scrollLeft }

  gsap.killTweensOf(proxy)
  const tween = gsap.to(proxy, {
    x: to,
    duration: SLIDE_DURATION,
    ease: 'power2.out',
    onUpdate: () => (scroller.scrollLeft = proxy.x),
    onComplete
  })

  return () => tween.kill()
}

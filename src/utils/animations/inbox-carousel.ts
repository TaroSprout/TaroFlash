import { gsap } from 'gsap'

const DURATION = 0.25

export type CarouselDirection = 'next' | 'prev'

export function carouselEnter(direction: CarouselDirection) {
  const xPercent = direction === 'next' ? 110 : -110
  return (el: Element, done: () => void) => {
    gsap.fromTo(
      el,
      { xPercent },
      {
        xPercent: 0,
        duration: DURATION,
        ease: 'power2.out',
        clearProps: 'transform',
        onComplete: done
      }
    )
  }
}

export function carouselLeave(direction: CarouselDirection) {
  const xPercent = direction === 'next' ? -110 : 110
  return (el: Element, done: () => void) => {
    const node = el as HTMLElement
    const { left, top, width, height } = node.getBoundingClientRect()
    const parentRect = node.parentElement!.getBoundingClientRect()
    node.style.position = 'absolute'
    node.style.left = `${left - parentRect.left}px`
    node.style.top = `${top - parentRect.top}px`
    node.style.width = `${width}px`
    node.style.height = `${height}px`
    gsap.to(node, { xPercent, duration: DURATION, ease: 'power2.in', onComplete: done })
  }
}

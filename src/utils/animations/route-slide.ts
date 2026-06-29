import { gsap } from 'gsap'
import type { Ref } from 'vue'

const DURATION = 0.3
const EASE = 'power2.inOut'

export function routeSlideLeave(going_to_dashboard: Ref<boolean>) {
  return (el: Element, done: () => void) => {
    const html = el as HTMLElement
    const x = going_to_dashboard.value ? '100%' : '-100%'

    html.style.position = 'absolute'
    html.style.top = '0'
    html.style.left = '0'
    html.style.width = '100%'

    gsap.to(html, { x, duration: DURATION, ease: EASE, onComplete: done })
  }
}

export function routeSlideEnter(going_to_dashboard: Ref<boolean>) {
  return (el: Element, done: () => void) => {
    const from_x = going_to_dashboard.value ? '-100%' : '100%'
    gsap.fromTo(
      el,
      { x: from_x },
      { x: '0%', duration: DURATION, ease: EASE, clearProps: 'transform', onComplete: done }
    )
  }
}

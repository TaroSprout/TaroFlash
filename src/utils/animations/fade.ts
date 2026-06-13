import { gsap } from 'gsap'

const DURATION = 0.12

export function fadeEnter(el: Element, done: () => void) {
  gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: DURATION, onComplete: done })
}

export function fadeLeave(el: Element, done: () => void) {
  gsap.to(el, { opacity: 0, duration: DURATION, onComplete: done })
}

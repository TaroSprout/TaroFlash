import { gsap } from 'gsap'
import type { Ref } from 'vue'

const ENTER_DURATION = 0.2
const LEAVE_DURATION = 0.15
const SLIDE_X = 48

/**
 * Directional slide for sheet/tablet tab transitions.
 *
 * Forward (index → tab): content fades out, new tab slides in from the right.
 * Back   (tab → index):  current tab slides out to the right, content fades in.
 *
 * When `wrapper` is provided (sheet layout), the wrapper's height is also
 * animated so the modal resizes smoothly as tab content changes.
 *
 * Pass the same `direction` ref to both leave and enter so the enter hook
 * reads the direction that was set before the leave began.
 */
export function tabSlideLeave(direction: Ref<'forward' | 'back'>, wrapper?: HTMLElement) {
  return (el: Element, done: () => void) => {
    if (wrapper) wrapper.style.height = `${wrapper.offsetHeight}px`

    if (direction.value === 'back') {
      gsap.to(el, {
        x: SLIDE_X,
        opacity: 0,
        duration: LEAVE_DURATION,
        ease: 'power2.in',
        clearProps: 'transform',
        onComplete: done
      })
    } else {
      gsap.to(el, { opacity: 0, duration: LEAVE_DURATION, onComplete: done })
    }
  }
}

export function tabSlideEnter(direction: Ref<'forward' | 'back'>, wrapper?: HTMLElement) {
  return (el: Element, done: () => void) => {
    const html = el as HTMLElement

    if (wrapper) {
      gsap.to(wrapper, {
        height: html.scrollHeight,
        duration: ENTER_DURATION,
        ease: 'power2.out',
        onComplete: () => {
          wrapper.style.height = ''
        }
      })
    }

    if (direction.value === 'forward') {
      gsap.fromTo(
        html,
        { x: SLIDE_X, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: ENTER_DURATION,
          ease: 'power2.out',
          clearProps: 'transform',
          onComplete: done
        }
      )
    } else {
      gsap.fromTo(html, { opacity: 0 }, { opacity: 1, duration: ENTER_DURATION, onComplete: done })
    }
  }
}

import { gsap } from 'gsap'
import type { Ref } from 'vue'

const ENTER_DURATION = 0.2
const LEAVE_DURATION = 0.15
const SLIDE_X = 48

/**
 * Slides a tab in or out, the way drilling into a menu and backing out of it
 * should feel on a narrow screen.
 *
 * Pass the same `direction` ref to both hooks — the enter hook needs the value
 * as it was before the leave began, so a fresh ref reads the wrong way round.
 *
 * @param wrapper - Resize this alongside the slide. For the sheet layout,
 *   where the panel itself has to grow and shrink with its content.
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

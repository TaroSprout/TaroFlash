import { gsap } from 'gsap'

const ENTER_DURATION = 0.25
const LEAVE_DURATION = 0.15
const SLIDE_X = 48

/**
 * Out-in transition between the study-session phases (flashcard → summary),
 * mirroring the deck-settings tab slide: the leaving pane fades out, then the
 * entering pane slides in from the right and fades in.
 *
 * `wrapper` is the full-bleed outlet both panes render into. Its height is
 * frozen on leave and tweened to the incoming pane's height on enter, so the
 * sheet resizes smoothly between the two panes' differing heights.
 *
 * Pass the same `wrapper` element to both hooks.
 */
export function sessionPaneLeave(wrapper?: HTMLElement) {
  return (el: Element, done: () => void) => {
    if (wrapper) wrapper.style.height = `${wrapper.offsetHeight}px`
    gsap.to(el, { opacity: 0, duration: LEAVE_DURATION, onComplete: done })
  }
}

export function sessionPaneEnter(wrapper?: HTMLElement) {
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
  }
}

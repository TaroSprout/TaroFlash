import { gsap } from 'gsap'

const ENTER_DURATION = 0.25
const LEAVE_DURATION = 0.15
const SLIDE_X = 48

/**
 * Out-in transition between the study-session phases (flashcard → summary),
 * mirroring the deck-settings tab slide: the leaving pane fades out, then the
 * entering pane slides in from the right and fades in.
 *
 * The modal is a fixed size and both panes fill it (`h-full`), so there's no
 * height to animate — just opacity and a short horizontal slide.
 */
export function sessionPaneLeave(el: Element, done: () => void) {
  gsap.to(el, { opacity: 0, duration: LEAVE_DURATION, onComplete: done })
}

export function sessionPaneEnter(el: Element, done: () => void) {
  gsap.fromTo(
    el,
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

import { gsap } from 'gsap'

const ENTER_DURATION = 0.18

/**
 * Fades a scroll handle in, growing its thumb out from the width of the bar
 * behind it.
 *
 * There is deliberately no matching exit — a handle is dropped the instant its
 * box stops overflowing, and fading one out over content that no longer scrolls
 * reads worse than a blunt cut.
 */
export function scrollHandleEnter(el: Element, done: () => void) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    done()
    return
  }

  gsap.killTweensOf(el) // An entrance restarting before it finished would fight the tween still running.

  // `from` reads the resting width and opacity off the stylesheet, so the CSS that draws the bar owns both ends.
  gsap.from(el, {
    opacity: 0,
    '--thumb-overhang': '0px',
    duration: ENTER_DURATION,
    ease: 'power2.out',
    clearProps: 'all',
    onComplete: done
  })
}

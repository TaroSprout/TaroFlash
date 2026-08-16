import { gsap } from 'gsap'

const ENTER_DURATION = 0.18

/**
 * Fades a scroll handle in, growing its thumb out from the width of the bar
 * behind it.
 *
 * There is no matching exit. A handle is dropped the instant its box stops
 * overflowing, and one still fading out over content that no longer scrolls
 * reads worse than a blunt cut.
 */
export function scrollHandleEnter(el: Element, done: () => void) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    done()
    return
  }

  // Killing first keeps an entrance that restarts before it finished from
  // fighting the tween already running on this element.
  gsap.killTweensOf(el)

  // `from` takes the resting width and opacity off the stylesheet, so the two
  // ends of the growth stay owned by the CSS that draws the bar.
  gsap.from(el, {
    opacity: 0,
    '--thumb-overhang': '0px',
    duration: ENTER_DURATION,
    ease: 'power2.out',
    clearProps: 'all',
    onComplete: done
  })
}

import { gsap } from 'gsap'

const DURATION = 0.15
const FADE_DURATION = 0.12

/**
 * Vue Transition JS hooks that animate a wrapper's height between tab swaps.
 *
 * Pair `onLeave` + `onEnter` on a `<Transition mode="out-in">` whose direct
 * parent is the `wrapper` element. The wrapper must be `overflow-hidden` so
 * the height clip is clean.
 *
 * Flow:
 * - leave: capture the wrapper's current height, freeze it, fade content out.
 * - enter: measure the new content's `scrollHeight`, tween the wrapper from
 *   the frozen height to the new height, then release back to `auto`.
 */
export function tabHeightLeave(wrapper: HTMLElement) {
  return (el: Element, done: () => void) => {
    wrapper.style.height = `${wrapper.offsetHeight}px`
    gsap.to(el, { opacity: 0, duration: FADE_DURATION, onComplete: done })
  }
}

export function tabHeightEnter(wrapper: HTMLElement) {
  return (el: Element, done: () => void) => {
    const html = el as HTMLElement
    const target = html.scrollHeight

    gsap.set(html, { opacity: 0 })
    gsap.to(wrapper, {
      height: target,
      duration: DURATION,
      ease: 'power2.out',
      onComplete: () => {
        wrapper.style.height = ''
      }
    })
    gsap.to(html, {
      opacity: 1,
      duration: FADE_DURATION,
      delay: DURATION - FADE_DURATION,
      onComplete: done
    })
  }
}

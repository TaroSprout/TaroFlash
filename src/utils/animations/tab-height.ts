import { gsap } from 'gsap'

const DURATION = 0.15
const FADE_DURATION = 0.12

/**
 * Resizes a panel smoothly as one tab replaces another.
 *
 * Pair both hooks on a `<Transition mode="out-in">` inside an
 * `overflow-hidden` wrapper — `onLeave` freezes the height and only `onEnter`
 * releases it, so using either alone strands the panel at a fixed size.
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

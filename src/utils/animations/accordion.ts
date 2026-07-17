import { gsap } from 'gsap'

const DURATION = 0.25

/**
 * Vue Transition JS hooks that expand/collapse an accordion panel by tweening
 * its height between 0 and its natural `scrollHeight`. Clear the inline height
 * afterwards so the panel reflows freely once open.
 */
export function accordionEnter(el: Element, done: () => void) {
  const html = el as HTMLElement

  gsap.set(html, { height: 0, opacity: 0, overflow: 'hidden' })
  gsap.to(html, {
    height: html.scrollHeight,
    opacity: 1,
    duration: DURATION,
    ease: 'power2.out',
    onComplete: () => {
      html.style.height = ''
      html.style.overflow = ''
      done()
    }
  })
}

export function accordionLeave(el: Element, done: () => void) {
  const html = el as HTMLElement

  gsap.set(html, { height: html.scrollHeight, overflow: 'hidden' })
  gsap.to(html, {
    height: 0,
    opacity: 0,
    duration: DURATION,
    ease: 'power2.in',
    onComplete: done
  })
}

import { gsap } from 'gsap'

const ENTER_DURATION = 0.1
const LEAVE_DURATION = 0.13
const OFFSET = 24
const HEIGHT_DURATION = 0.15

/** Slide-in from the right + fade in. Pair with `slideFadeRightLeave`. */
export function slideFadeRightEnter(el: Element, done: () => void) {
  gsap.fromTo(
    el,
    { opacity: 0, x: OFFSET },
    {
      opacity: 1,
      x: 0,
      duration: ENTER_DURATION,
      ease: 'power2.out',
      clearProps: 'transform,rotate',
      onComplete: done
    }
  )
}

/** Slide-out to the right + fade out. */
export function slideFadeRightLeave(el: Element, done: () => void) {
  gsap.to(el, {
    opacity: 0,
    x: OFFSET,
    duration: LEAVE_DURATION,
    ease: 'power2.out',
    onComplete: done
  })
}

/**
 * Freeze wrapper height then slide element out to the right.
 * Pair with `tabSlideRightEnter` on the same `<Transition mode="out-in">`.
 */
export function tabSlideRightLeave(wrapper: HTMLElement) {
  return (el: Element, done: () => void) => {
    gsap.killTweensOf(wrapper)
    wrapper.style.height = ''
    wrapper.style.height = `${wrapper.offsetHeight}px`
    slideFadeRightLeave(el, done)
  }
}

/**
 * Slide element in from the right while tweening wrapper height to fit the new content.
 * Pair with `tabSlideRightLeave`.
 */
export function tabSlideRightEnter(wrapper: HTMLElement) {
  return (el: Element, done: () => void) => {
    const html = el as HTMLElement
    gsap.set(html, { opacity: 0, x: OFFSET })
    gsap.killTweensOf(wrapper)

    requestAnimationFrame(() => {
      const frozen = parseFloat(wrapper.style.height) || wrapper.offsetHeight
      wrapper.style.height = 'auto'
      const target = wrapper.offsetHeight
      wrapper.style.height = `${frozen}px`

      gsap.to(wrapper, {
        height: target,
        duration: HEIGHT_DURATION,
        ease: 'power2.out',
        onComplete: () => {
          wrapper.style.height = ''
          done()
        }
      })
      gsap.to(html, {
        opacity: 1,
        x: 0,
        duration: ENTER_DURATION,
        ease: 'power2.out',
        clearProps: 'transform'
      })
    })
  }
}

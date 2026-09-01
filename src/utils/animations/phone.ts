import { gsap } from 'gsap'

const BLUR_AMOUNT = 12
const TRANSLATE_AMOUNT = 100

export function slideDownBlurIn(el: Element, done: () => void) {
  gsap.fromTo(
    el,
    { translateY: `-${TRANSLATE_AMOUNT}px`, opacity: 0, filter: `blur(${BLUR_AMOUNT}px)` },
    {
      translateY: 0,
      opacity: 1,
      filter: 'blur(0)',
      duration: 0.1,
      ease: 'expo.out',
      // Clear the inline transform, or it permanently outranks the element's resting transform class.
      clearProps: 'transform',
      onComplete: done
    }
  )
}

export function slideUpBlurOut(el: Element, done: () => void) {
  gsap.to(el, {
    translateY: `-${TRANSLATE_AMOUNT}px`,
    opacity: 0,
    filter: `blur(${BLUR_AMOUNT}px)`,
    duration: 0.1,
    ease: 'expo.out',
    onComplete: done
  })
}

export function slideUpBlurIn(el: Element, done: () => void) {
  gsap.fromTo(
    el,
    { translateY: `${TRANSLATE_AMOUNT}px`, opacity: 0, filter: `blur(${BLUR_AMOUNT}px)` },
    {
      translateY: 0,
      opacity: 1,
      filter: 'blur(0)',
      duration: 0.1,
      ease: 'expo.out',
      // Clear the inline transform, or it permanently outranks the element's resting transform class.
      clearProps: 'transform',
      onComplete: done
    }
  )
}

export function slideDownBlurOut(el: Element, done: () => void) {
  gsap.to(el, {
    translateY: `${TRANSLATE_AMOUNT}px`,
    opacity: 0,
    filter: `blur(${BLUR_AMOUNT}px)`,
    duration: 0.1,
    ease: 'expo.out',
    onComplete: done
  })
}

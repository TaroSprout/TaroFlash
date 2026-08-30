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
      // Drop the inline transform once done, or it permanently overrides a resting
      // transform (e.g. rotate-6) the element carries as a class.
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
      // Drop the inline transform once done, or it permanently overrides a resting
      // transform (e.g. rotate-6) the element carries as a class.
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

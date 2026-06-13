import { gsap } from 'gsap'

const DURATION = 0.3

/** Pop a freshly-uploaded card-face image in with a slight scale + fade. */
export function revealFaceImage(el: HTMLElement) {
  gsap.from(el, {
    scale: 0.92,
    opacity: 0,
    duration: DURATION,
    ease: 'back.out(1.7)',
    clearProps: 'all'
  })
}

/**
 * Scale a card-face image down as it's removed — the mirror of
 * {@link revealFaceImage}. Resolves on completion so the caller can run the
 * deletion once the image has visibly collapsed. No `clearProps`: the element
 * unmounts next, so it should stay collapsed.
 */
export function collapseFaceImage(el: HTMLElement) {
  return new Promise<void>((resolve) => {
    gsap.to(el, {
      scale: 0.92,
      opacity: 0,
      duration: DURATION,
      ease: 'back.in(1.7)',
      onComplete: resolve
    })
  })
}

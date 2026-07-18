import { gsap } from 'gsap'

// The card flip (src/components/card/index.vue delegates here), generalised so
// the rotation axis can be chosen: 'y' flips horizontally (the card), 'x'
// vertically.
type FlipAxis = 'x' | 'y'

const ROTATE = { x: 'rotateX', y: 'rotateY' } as const

export function flipEnter(el: Element, axis: FlipAxis, done: () => void) {
  gsap.fromTo(
    el,
    { [ROTATE[axis]]: -60, translateY: '-12px', scale: 0.95 },
    {
      [ROTATE[axis]]: 0,
      translateY: 0,
      scale: 1,
      duration: 0.2,
      ease: 'back.out(2)',
      // The resting state is identity, so drop GSAP's inline transform on
      // completion — otherwise it shadows CSS hover transforms (e.g. scale).
      clearProps: 'transform',
      onComplete: done
    }
  )
}

export function flipLeave(el: Element, axis: FlipAxis, done: () => void) {
  gsap.to(el, {
    [ROTATE[axis]]: 60,
    translateY: '8px',
    scale: 0.95,
    duration: 0.12,
    ease: 'expo.in',
    onComplete: done
  })
}

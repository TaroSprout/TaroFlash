import { gsap } from 'gsap'

// Turning a card over. `y` turns it left-to-right, `x` top-to-bottom.
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
      // Drop the inline transform, or it shadows the card's CSS hover effects. →[K:settled-transform-traps-overlays]
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

import { gsap } from 'gsap'
import { useMotionStore } from '@/stores/motion'

const DURATION = 0.2

// A JS/GSAP transition can't hang off a Tailwind variant, so it reads the
// same live reduced-motion signal the motion store already tracks.
function motionSafe() {
  return !useMotionStore().prefers_reduced_motion
}

export function translationCrossfadeEnter(el: Element, done: () => void) {
  if (!motionSafe()) {
    gsap.set(el, { opacity: 1 })
    done()
    return
  }

  gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: DURATION, onComplete: done })
}

export function translationCrossfadeLeave(el: Element, done: () => void) {
  if (!motionSafe()) {
    done()
    return
  }

  gsap.to(el, { opacity: 0, duration: DURATION, onComplete: done })
}

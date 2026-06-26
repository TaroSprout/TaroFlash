import { gsap } from 'gsap'

const DURATION = 0.3
const EASE = 'power3.out'

/** Reveal the search input by widening it from 0 to `width`px as it fades in. */
export function expandSearchInput(input: HTMLElement, width: number, done?: () => void) {
  gsap.killTweensOf(input)
  gsap.fromTo(
    input,
    { width: 0, opacity: 0 },
    { width, opacity: 1, duration: DURATION, ease: EASE, onComplete: done }
  )
}

/** Reverse of {@link expandSearchInput}: collapse the input back to nothing. */
export function collapseSearchInput(input: HTMLElement, done?: () => void) {
  gsap.killTweensOf(input)
  gsap.to(input, { width: 0, opacity: 0, duration: DURATION, ease: EASE, onComplete: done })
}

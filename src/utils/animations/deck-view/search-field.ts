import { gsap } from 'gsap'

const DURATION = 0.3
const EASE = 'power3.out'

/** Reveal the search input by widening it from 0 to `width`px as it fades in. */
export function expandSearchInput(input: HTMLElement, width: number, done?: () => void) {
  gsap.killTweensOf(input)
  gsap.fromTo(
    input,
    // oxlint-disable-next-line compositor-only/no-layout-tween -- pre-existing search-field width reveal, not yet routed through the stage primitive. Follow-on: migrate onto useStageHeight's width equivalent (post-TARO-412).
    { width: 0, opacity: 0 },
    { width, opacity: 1, duration: DURATION, ease: EASE, onComplete: done }
  )
}

/** Reverse of {@link expandSearchInput}: collapse the input back to nothing. */
export function collapseSearchInput(input: HTMLElement, done?: () => void) {
  gsap.killTweensOf(input)
  // oxlint-disable-next-line compositor-only/no-layout-tween -- pre-existing search-field width reveal, not yet routed through the stage primitive. Follow-on: migrate onto useStageHeight's width equivalent (post-TARO-412).
  gsap.to(input, { width: 0, opacity: 0, duration: DURATION, ease: EASE, onComplete: done })
}

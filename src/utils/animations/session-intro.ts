import { gsap } from 'gsap'

const SETTLE_DURATION = 0.4
const COVER_SCALE = 1.25

/** Vertical gap between the title's header slot and the progress bar's centre. */
function offsetToProgress(title: HTMLElement, progress: HTMLElement) {
  const t = title.getBoundingClientRect()
  const p = progress.getBoundingClientRect()
  return p.top + p.height / 2 - (t.top + t.height / 2)
}

/**
 * Pre-session framing: drop the deck title down onto the (hidden) progress slot
 * and scale it up a touch, so the cover doesn't leave an awkward gap between the
 * header and the card. Measured relative to current layout, so it's immune to
 * the modal's own enter transform.
 */
export function placeTitleOnProgress(title: HTMLElement, progress: HTMLElement) {
  gsap.set(title, { y: offsetToProgress(title, progress), scale: COVER_SCALE })
  gsap.set(progress, { opacity: 0 })
}

/**
 * On session start, slide the title back up into the header and fade the
 * progress bar in where the title was sitting.
 */
export function settleStudyingChrome(title: HTMLElement, progress: HTMLElement) {
  gsap.to(title, {
    y: 0,
    scale: 1,
    duration: SETTLE_DURATION,
    ease: 'power2.out',
    clearProps: 'transform'
  })
  gsap.to(progress, {
    opacity: 1,
    duration: SETTLE_DURATION,
    ease: 'power2.out',
    clearProps: 'opacity'
  })
}

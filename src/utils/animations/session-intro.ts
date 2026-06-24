import { gsap } from 'gsap'
import { emitSfx } from '@/sfx/bus'

const SETTLE_DURATION = 0.4
const COVER_SCALE = 1.25
const COVER_CARD_RISE = 60
const COVER_CARD_DURATION = 0.1
// Hold the card hidden until the modal's pop-in (~0.13s) has settled.
const COVER_CARD_DELAY = 0.15

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
/**
 * Slide-and-fade the deck-cover preview card in once the modal's pop-in has
 * settled. The caller keeps the card hidden via a markup class the whole time;
 * this tween's inline opacity (left in place — only `transform` is cleared)
 * overrides that class once the rise runs, so there's never a frame that
 * depends on gsap's render timing. Returns the tween so the caller can kill it
 * if the modal closes mid-rise.
 */
export function revealCoverCard(el: HTMLElement) {
  return gsap.fromTo(
    el,
    { y: COVER_CARD_RISE, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: COVER_CARD_DURATION,
      delay: COVER_CARD_DELAY,
      ease: 'power2.out',
      overwrite: 'auto',
      clearProps: 'transform',
      onStart: () => emitSfx('slide_up')
    }
  )
}

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

import { gsap } from 'gsap'

export type CursorBox = { left: number; top: number; width: number; height: number }

// The leading edge snaps quickly while the trailing edge follows slower, so a
// fast passage stretches the highlight across the words it sweeps past, then it
// contracts snug around the active one once the audio settles.
const LEAD = 0.16
const TRAIL = 0.45
const VERTICAL = 0.2
const FADE = 0.2

type Edges = { left: number; right: number }

// Per-element edge state so each move animates from where the highlight
// actually is, and stale tweens get killed cleanly (they target this object).
const edgesByEl = new WeakMap<HTMLElement, Edges>()

function paint(el: HTMLElement, edges: Edges) {
  el.style.left = `${edges.left}px`
  el.style.width = `${Math.max(0, edges.right - edges.left)}px`
}

/**
 * Glide a floating highlight `el` to cover `box` (coordinates relative to its
 * offset parent). With `stretch` (the default, used for audio-driven moves) the
 * leading edge leads and the trailing edge lags, so the highlight elongates
 * through fast passages then shrinks back to one word. With `stretch: false`
 * (the hover layer) it moves both edges together to cover `box` directly;
 * `duration` overrides the edge/vertical speed so the hover pill can answer the
 * pointer faster than the audio playhead.
 *
 * A line change (different `top`) can't be stretched horizontally either, so it
 * also slides straight across. The first call drops the highlight onto the box
 * with no animation.
 */
export function moveReaderCursor(
  el: HTMLElement,
  box: CursorBox,
  { stretch = true, duration }: { stretch?: boolean; duration?: number } = {}
) {
  const target_right = box.left + box.width
  const edges = edgesByEl.get(el)

  if (!edges) {
    const next = { left: box.left, right: target_right }
    edgesByEl.set(el, next)
    gsap.set(el, { top: box.top, height: box.height, autoAlpha: 1 })
    paint(el, next)
    return
  }

  const line_jump = Math.abs(box.top - (gsap.getProperty(el, 'top') as number)) > 1

  gsap.to(el, {
    top: box.top,
    height: box.height,
    autoAlpha: 1,
    duration: duration ?? VERTICAL,
    ease: 'power2.out',
    overwrite: 'auto'
  })
  gsap.killTweensOf(edges)

  if (line_jump || !stretch) {
    gsap.to(edges, {
      left: box.left,
      right: target_right,
      duration: duration ?? LEAD,
      ease: 'power2.out',
      onUpdate: () => paint(el, edges)
    })
    return
  }

  const forward = target_right >= edges.right
  gsap.to(edges, {
    left: box.left,
    duration: forward ? TRAIL : LEAD,
    ease: 'power2.out',
    onUpdate: () => paint(el, edges)
  })
  gsap.to(edges, {
    right: target_right,
    duration: forward ? LEAD : TRAIL,
    ease: 'power2.out',
    onUpdate: () => paint(el, edges)
  })
}

/**
 * Fade the highlight out and forget its position, so the next
 * `moveReaderCursor` drops fresh onto the new word instead of sliding across
 * the page from a stale spot.
 */
export function hideReaderCursor(el: HTMLElement) {
  const edges = edgesByEl.get(el)
  if (edges) gsap.killTweensOf(edges)
  edgesByEl.delete(el)
  gsap.to(el, { autoAlpha: 0, duration: FADE, ease: 'power2.out' })
}

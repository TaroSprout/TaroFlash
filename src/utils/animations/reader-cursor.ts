import { gsap } from 'gsap'

export type CursorBox = { left: number; top: number; width: number; height: number }

const LEAD = 0.16
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
 * offset parent), moving both edges together. `duration` overrides the default
 * edge/vertical speed so the pointer-driven pill can answer the pointer quickly.
 * The first call drops the highlight onto the box with no animation.
 */
export function moveReaderCursor(
  el: HTMLElement,
  box: CursorBox,
  { duration }: { duration?: number } = {}
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

  gsap.to(el, {
    top: box.top,
    height: box.height,
    autoAlpha: 1,
    duration: duration ?? VERTICAL,
    ease: 'power2.out',
    overwrite: 'auto'
  })
  gsap.killTweensOf(edges)

  gsap.to(edges, {
    left: box.left,
    right: target_right,
    duration: duration ?? LEAD,
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

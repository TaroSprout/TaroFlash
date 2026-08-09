import { gsap } from 'gsap'

export type CursorBox = { left: number; top: number; width: number; height: number }

const LEAD = 0.16
const VERTICAL = 0.2
const FADE = 0.2

type Edges = { left: number; right: number }

// Keyed per element so a move starts from where that highlight actually is,
// and so an interrupted tween has something specific to be killed on.
const edgesByEl = new WeakMap<HTMLElement, Edges>()

function paint(el: HTMLElement, edges: Edges) {
  el.style.left = `${edges.left}px`
  el.style.width = `${Math.max(0, edges.right - edges.left)}px`
}

/**
 * Glides the reading highlight onto a word, both edges moving together. The
 * first call drops it into place instead, with no glide from nowhere.
 *
 * @param box - Where to land, relative to the highlight's offset parent.
 * @param duration - Override the default speed. The pointer-driven pill runs
 *   faster so it keeps up with the finger.
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
 * Fades the highlight out and forgets where it was, so it reappears on the
 * next word rather than streaking across the page to reach it.
 */
export function hideReaderCursor(el: HTMLElement) {
  const edges = edgesByEl.get(el)
  if (edges) gsap.killTweensOf(edges)
  edgesByEl.delete(el)
  gsap.to(el, { autoAlpha: 0, duration: FADE, ease: 'power2.out' })
}

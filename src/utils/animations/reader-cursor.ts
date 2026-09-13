import { gsap } from 'gsap'

export type CursorBox = { left: number; top: number; width: number; height: number }

const MOVE = 0.2
const FADE = 0.2

// The box's real, currently-applied geometry plus a handle on the in-flight transform tween easing it toward that geometry, so an interrupted move can kill the stale one before starting the next.
type Placed = { box: CursorBox; tween: gsap.core.Tween | null }
const placedByEl = new WeakMap<HTMLElement, Placed>()

/** Paints one frame of the FLIP tween easing `delta` toward identity. */
function paintDelta(el: HTMLElement, delta: { x: number; y: number; sx: number; sy: number }) {
  el.style.transform = `translate(${delta.x}px, ${delta.y}px) scale(${delta.sx}, ${delta.sy})`
}

/**
 * Glides the reading highlight onto a word, both edges moving together. The
 * first call drops it into place instead, with no glide from nowhere.
 *
 * `left`/`top`/`width`/`height` snap to the target instantly on every call —
 * never tweened — so the box's texture overlay always tiles against its true
 * size. The glide itself is a FLIP: the box is inverted back to where it
 * visually sat a moment ago via `transform`, then eased to identity, so the
 * only per-frame write is `transform`.
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
  const placed = placedByEl.get(el)

  el.style.left = `${box.left}px`
  el.style.top = `${box.top}px`
  el.style.width = `${Math.max(0, box.width)}px`
  el.style.height = `${Math.max(0, box.height)}px`

  if (!placed) {
    el.style.transform = 'none'
    placedByEl.set(el, { box, tween: null })
    gsap.set(el, { autoAlpha: 1 })
    return
  }

  placed.tween?.kill()

  gsap.to(el, {
    autoAlpha: 1,
    duration: duration ?? MOVE,
    ease: 'power2.out',
    overwrite: 'auto'
  })

  const delta = {
    x: placed.box.left - box.left,
    y: placed.box.top - box.top,
    sx: box.width > 0 ? placed.box.width / box.width : 1,
    sy: box.height > 0 ? placed.box.height / box.height : 1
  }
  paintDelta(el, delta)

  const tween = gsap.to(delta, {
    x: 0,
    y: 0,
    sx: 1,
    sy: 1,
    duration: duration ?? MOVE,
    ease: 'power2.out',
    onUpdate: () => paintDelta(el, delta)
  })

  placedByEl.set(el, { box, tween })
}

/**
 * Fades the highlight out and forgets where it was, so it reappears on the
 * next word rather than streaking across the page to reach it.
 */
export function hideReaderCursor(el: HTMLElement) {
  placedByEl.get(el)?.tween?.kill()
  placedByEl.delete(el)
  gsap.to(el, { autoAlpha: 0, duration: FADE, ease: 'power2.out' })
}

import { gsap } from 'gsap'

interface PinOptions {
  // Freeze the node at its current on-screen box instead of stretching it to the
  // parent's top-left — for a FLIP where the siblings collapse into the gap it
  // leaves while it animates in place.
  freeze?: boolean
  // Lock the measured height in pixels too, for a pane whose parent resizes under
  // it mid-leave: a `h-full` class or `inset: 0` re-resolves against the new
  // layout every frame, this pins the height it had when it started leaving.
  lockHeight?: boolean
}

/**
 * Lifts a leaving node out of layout flow so its replacement can claim the slot
 * without waiting for it to finish animating.
 *
 * Wire it inside a `position: relative` parent. By default it stretches to the
 * parent's top-left at full width; `freeze` nails it to its current on-screen box.
 */
export function pinOutOfFlow(
  el: HTMLElement,
  { freeze = false, lockHeight = false }: PinOptions = {}
) {
  if (freeze) {
    const { offsetTop, offsetLeft, offsetWidth, offsetHeight } = el
    gsap.set(el, {
      position: 'absolute',
      top: offsetTop,
      left: offsetLeft,
      width: offsetWidth,
      height: offsetHeight
    })
    return
  }

  const vars: gsap.TweenVars = { position: 'absolute', top: 0, left: 0, width: '100%' }
  if (lockHeight) vars.height = el.getBoundingClientRect().height

  gsap.set(el, vars)
}

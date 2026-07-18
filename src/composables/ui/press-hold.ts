import { getCurrentScope, onScopeDispose } from 'vue'

const DEFAULT_DURATION = 350
const DEFAULT_TOLERANCE = 8
// A completed hold ends on a pointerup, which the browser also reports as a
// click. Swallow only the first click after the hold, and give up on it shortly
// after in case the release never produces one.
const CLICK_SWALLOW_MS = 350

type PressHoldOptions = {
  // How long the pointer must stay down (ms) before the hold is recognized.
  duration?: number
  // How far (px) the pointer may drift before the pending hold aborts.
  tolerance?: number
}

/**
 * A single press-and-hold recognizer. Arm it from a `pointerdown`; if the
 * pointer stays down and roughly still for `duration`, `onHold` fires once. Any
 * meaningful move, a release, or a cancel aborts the pending hold.
 *
 * The recognizer is deliberately dumb — it knows nothing about what a hold
 * means. The caller decides pointer-type policy (e.g. mouse acts immediately,
 * touch waits out the hold) and what `onHold` does. A recognized hold also
 * swallows the follow-up `click` at document capture so releasing after a hold
 * never also fires the tap path.
 *
 * Touch-action is left untouched so idle elements keep scrolling the page.
 *
 * @example
 * const hold = usePressHold({ duration: 200 })
 * function onPointerdown(e: PointerEvent) {
 *   if (e.pointerType === 'mouse') return beginDrag(e)
 *   hold.arm(e, () => beginDrag(e))
 * }
 */
export function usePressHold(options: PressHoldOptions = {}) {
  const { duration = DEFAULT_DURATION, tolerance = DEFAULT_TOLERANCE } = options

  let timer = 0
  let origin = { x: 0, y: 0 }
  let pending: (() => void) | null = null

  function teardown() {
    if (timer) clearTimeout(timer)
    timer = 0
    pending = null
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', cancel)
    window.removeEventListener('pointercancel', cancel)
  }

  function onMove(event: PointerEvent) {
    const moved = Math.hypot(event.clientX - origin.x, event.clientY - origin.y)
    if (moved > tolerance) cancel()
  }

  function onElapsed() {
    const onHold = pending
    teardown()
    if (!onHold) return

    onHold()
    swallowNextClick()
  }

  /** Abort any pending hold and drop its window listeners. Idempotent. */
  function cancel() {
    teardown()
  }

  /** Start a hold from a `pointerdown`; `onHold` fires once if the timer survives. */
  function arm(event: PointerEvent, onHold: () => void) {
    cancel()

    pending = onHold
    origin = { x: event.clientX, y: event.clientY }
    timer = window.setTimeout(onElapsed, duration)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', cancel)
    window.addEventListener('pointercancel', cancel)
  }

  if (getCurrentScope()) onScopeDispose(cancel)

  return { arm, cancel }
}

/** Eat the single click the browser fires when the hold's pointer releases. */
function swallowNextClick() {
  function handler(event: Event) {
    // stopImmediatePropagation, not stopPropagation: other document-capture
    // listeners (e.g. the popover's outside-click close) register after this
    // one and must not see the release click either.
    event.stopImmediatePropagation()
    event.preventDefault()
    document.removeEventListener('click', handler, { capture: true })
    clearTimeout(expiry)
  }

  const expiry = window.setTimeout(() => {
    document.removeEventListener('click', handler, { capture: true })
  }, CLICK_SWALLOW_MS)

  document.addEventListener('click', handler, { capture: true })
}

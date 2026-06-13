import { onScopeDispose } from 'vue'

// Shared across every consumer: a window-blur departure recorded by one card
// may be answered by a refocus landing on a different card, so the flag can't
// live per-instance. `pending` is true between an editor losing focus to a
// window blur and the browser restoring focus once the window comes back.
let consumers = 0
let pending = false

function clearPending() {
  // The restoring focusin fires synchronously when the window regains focus,
  // before this rAF runs — so it consumes `pending` first. This only sweeps up
  // a stale flag left when the user returns without refocusing any editor.
  requestAnimationFrame(() => (pending = false))
}

/**
 * Tells a focus handler apart a user moving focus from the OS blurring and
 * later re-focusing the window (which makes the active element blur, then
 * refocus on its own). Lets focus-driven sfx stay silent across that round-trip.
 *
 * Pair with `document.hasFocus()` in the focusout handler — it already reads
 * `false` when the blur is caused by the window losing focus.
 *
 * @example
 * const { flagWindowBlur, consumeWindowRefocus } = useWindowRefocusGuard()
 * function onFocusOut() { if (!document.hasFocus()) return flagWindowBlur() }
 * function onFocusIn() { if (consumeWindowRefocus()) return }
 */
export function useWindowRefocusGuard() {
  if (consumers++ === 0) window.addEventListener('focus', clearPending)
  onScopeDispose(() => {
    if (--consumers === 0) window.removeEventListener('focus', clearPending)
  })

  return { flagWindowBlur, consumeWindowRefocus }
}

/** Record that an editor blurred because the window lost focus. */
function flagWindowBlur() {
  pending = true
}

/** Consume the pending window-refocus, returning whether one was outstanding. */
function consumeWindowRefocus() {
  if (!pending) return false
  pending = false
  return true
}

import { onScopeDispose } from 'vue'

// True between an editor losing focus to a window blur and the window regaining focus.
// →[K:window-refocus-guard-shared-flag]
let consumers = 0
let pending = false

// →[K:window-refocus-guard-self-clear]
function clearPending() {
  requestAnimationFrame(() => (pending = false))
}

/**
 * Tells a focus handler apart a user moving focus from the OS blurring and
 * later re-focusing the window (which makes the active element blur, then
 * refocus on its own). Lets focus-driven sfx stay silent across that round-trip.
 *
 * Pair with `document.hasFocus()` in the focusout handler — it already reads
 * `false` when the blur is caused by the window losing focus.
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

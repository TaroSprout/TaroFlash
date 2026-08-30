import { onScopeDispose, readonly, ref } from 'vue'

// Browser chrome parked over the bottom of the page shrinks the visible area without
// changing the window height, and that gap is what decides whether the app pads for
// itself — never a per-browser table. →[K:safe-area-viewport-gap-signal]
const GAP_THRESHOLD_PX = 10
const DEBOUNCE_MS = 120

// Starts false so a fixed-bottom element pads itself on first paint and errs toward
// extra room, rather than sitting clipped until the first measurement lands.
const is_covered = ref(false)
let consumers = 0
let timeout: ReturnType<typeof setTimeout> | undefined

function measure() {
  const viewport = window.visualViewport
  if (!viewport) return

  const chrome_gap = window.innerHeight - (viewport.height + viewport.offsetTop)
  is_covered.value = chrome_gap > GAP_THRESHOLD_PX
}

function update() {
  clearTimeout(timeout)
  timeout = setTimeout(measure, DEBOUNCE_MS)
}

/**
 * Whether docked browser chrome already sits over the bottom strip of the screen.
 *
 * False means nothing covers it, so anything pinned to the bottom edge has to
 * supply its own `env(safe-area-inset-bottom)` to clear the device's edge.
 */
export function useBottomChromeCover() {
  if (consumers++ === 0) {
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    measure()
  }

  onScopeDispose(() => {
    if (--consumers > 0) return
    window.visualViewport?.removeEventListener('resize', update)
    window.visualViewport?.removeEventListener('scroll', update)
    clearTimeout(timeout)
  })

  return { is_covered: readonly(is_covered) }
}

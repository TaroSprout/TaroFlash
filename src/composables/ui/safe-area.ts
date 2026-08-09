import { watch } from 'vue'
import { useMatchMedia } from './media-query'

// Browser chrome parked over the bottom of the page shrinks the visible area without
// changing the window height, and that gap is what decides whether the app pads for
// itself — never a per-browser table. →[K:safe-area-viewport-gap-signal]
const VAR = '--edge-safe-padding'
const GAP_THRESHOLD_PX = 10
const DEBOUNCE_MS = 120

const is_coarse = useMatchMedia('coarse')
let consumers = 0
let timeout: ReturnType<typeof setTimeout> | undefined
let stop_pointer_watch: (() => void) | undefined

function measure() {
  const root = document.documentElement
  const viewport = window.visualViewport

  if (!viewport || !is_coarse.value) {
    root.style.setProperty(VAR, '0px')
    return
  }

  const chrome_gap = window.innerHeight - (viewport.height + viewport.offsetTop)
  root.style.setProperty(VAR, chrome_gap > GAP_THRESHOLD_PX ? '0px' : 'env(safe-area-inset-bottom)')
}

function update() {
  clearTimeout(timeout)
  timeout = setTimeout(measure, DEBOUNCE_MS)
}

/**
 * Installs a live `--edge-safe-padding` CSS var on the document root: the
 * device's bottom safe-area inset when a fixed-bottom element would sit flush
 * against the literal screen edge, or `0px` when docked browser chrome is
 * already covering that strip. Call once (e.g. from App.vue); returns a
 * teardown that removes the listeners it registered.
 */
export function installSafeAreaPadding(): () => void {
  if (typeof window === 'undefined') return () => {}

  if (consumers++ === 0) {
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    stop_pointer_watch = watch(is_coarse, measure)
    measure()
  }

  return () => {
    if (--consumers > 0) return
    window.visualViewport?.removeEventListener('resize', update)
    window.visualViewport?.removeEventListener('scroll', update)
    stop_pointer_watch?.()
    clearTimeout(timeout)
  }
}

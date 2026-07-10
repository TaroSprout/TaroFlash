import { watch } from 'vue'
import { useMatchMedia } from './media-query'

// A fixed-bottom element needs the device's own safe-area inset applied only
// when nothing else is already covering that strip — a Chrome toolbar that
// auto-hides on scroll, a standalone PWA, or Safari with its tab bar moved to
// the top all leave our content flush with the literal screen edge. Safari's
// default bottom bar, by contrast, blends translucently over that strip and
// already provides the buffer.
//
// Rather than keep a browser/mode config list — which breaks the moment a
// vendor changes chrome behavior — this measures it live: the layout viewport
// (`window.innerHeight`) holds steady while chrome is docked, but the
// *visual* viewport shrinks to make room for it. A gap between the two means
// chrome is currently covering the bottom strip; no gap means we are.
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
 * already covering that strip. Usable anywhere via e.g. `pb-(--edge-safe-padding)`
 * — no per-component wiring needed. Call once (e.g. from App.vue); returns a
 * teardown that removes the listeners it registered.
 *
 * @example
 * teardown = installSafeAreaPadding()
 * // <footer class="pb-(--edge-safe-padding)">
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

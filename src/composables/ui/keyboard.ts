import { onScopeDispose, ref, watch } from 'vue'
import { useMatchMedia } from './media-query'

// On-screen keyboard shrinks the visual viewport. Comparing against
// `window.innerHeight` is unreliable — mobile Safari also resizes that as its
// own toolbar hides/shows while scrolling, which fired mid-keystroke (the
// scroll-pin composable nudges scrollY on every result change) and made the
// dock flicker. Comparing against the largest visualViewport height we've
// seen sidesteps that: the toolbar hiding only ever grows the viewport
// (raising the baseline), while the keyboard only ever shrinks it.
//
// That high-water mark only makes sense on touch devices though — a real
// on-screen keyboard can't open without one. Gating on `pointer: coarse`
// stops a plain desktop window resize (which shrinks the viewport under a
// fine pointer) from reading as a keyboard: the baseline just tracks the
// current height instead of accumulating a max.
const THRESHOLD_PX = 100
// Coalesces the burst of resize events a keyboard transition (or predictive
// text bar toggling) fires, so the flag settles once instead of flickering.
const DEBOUNCE_MS = 120

const is_open = ref(false)
const is_coarse = useMatchMedia('coarse')
let consumers = 0
let max_height = 0
let timeout: ReturnType<typeof setTimeout> | undefined
let stop_pointer_watch: (() => void) | undefined

function measure() {
  const viewport = window.visualViewport
  if (!viewport) return

  if (!is_coarse.value) {
    max_height = viewport.height
    is_open.value = false
    return
  }

  max_height = Math.max(max_height, viewport.height)
  is_open.value = max_height - viewport.height > THRESHOLD_PX
}

function update() {
  clearTimeout(timeout)
  timeout = setTimeout(measure, DEBOUNCE_MS)
}

/**
 * Tracks whether the on-screen keyboard is likely open.
 *
 * @example
 * const { is_open } = useKeyboardOpen()
 * // <footer v-show="!is_open">
 */
export function useKeyboardOpen() {
  if (consumers++ === 0) {
    window.visualViewport?.addEventListener('resize', update)
    stop_pointer_watch = watch(is_coarse, measure)
    measure()
  }

  onScopeDispose(() => {
    if (--consumers > 0) return
    window.visualViewport?.removeEventListener('resize', update)
    stop_pointer_watch?.()
    clearTimeout(timeout)
  })

  return { is_open }
}

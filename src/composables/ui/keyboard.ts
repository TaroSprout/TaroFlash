import { onScopeDispose, ref } from 'vue'

// On-screen keyboard shrinks the visual viewport. Comparing against
// `window.innerHeight` is unreliable — mobile Safari also resizes that as its
// own toolbar hides/shows while scrolling, which fired mid-keystroke (the
// scroll-pin composable nudges scrollY on every result change) and made the
// dock flicker. Comparing against the largest visualViewport height we've
// seen sidesteps that: the toolbar hiding only ever grows the viewport
// (raising the baseline), while the keyboard only ever shrinks it.
const THRESHOLD_PX = 100
// Coalesces the burst of resize events a keyboard transition (or predictive
// text bar toggling) fires, so the flag settles once instead of flickering.
const DEBOUNCE_MS = 120

const is_open = ref(false)
let consumers = 0
let max_height = 0
let timeout: ReturnType<typeof setTimeout> | undefined

function measure() {
  const viewport = window.visualViewport
  if (!viewport) return
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
    measure()
  }

  onScopeDispose(() => {
    if (--consumers > 0) return
    window.visualViewport?.removeEventListener('resize', update)
    clearTimeout(timeout)
  })

  return { is_open }
}

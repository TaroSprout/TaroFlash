import { onScopeDispose, ref, watch } from 'vue'
import { useMatchMedia } from './media-query'

// Px the viewport must shrink below its high-water mark to count as "open". →[K:keyboard-detection-high-water-mark]
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

/**
 * Mobile Chrome's URL bar shrinks the viewport exactly the way a keyboard does,
 * so a shrink only counts when something typeable holds focus.
 * →[K:keyboard-detection-needs-editable-focus]
 */
function hasEditableFocus(): boolean {
  const el = document.activeElement as HTMLElement | null
  if (!el) return false
  return el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'
}

function measure() {
  const viewport = window.visualViewport
  if (!viewport) return

  if (!is_coarse.value) {
    max_height = viewport.height
    is_open.value = false
    return
  }

  max_height = Math.max(max_height, viewport.height)
  is_open.value = max_height - viewport.height > THRESHOLD_PX && hasEditableFocus()
}

function update() {
  clearTimeout(timeout)
  timeout = setTimeout(measure, DEBOUNCE_MS)
}

/** Tracks whether the on-screen keyboard is likely open. */
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

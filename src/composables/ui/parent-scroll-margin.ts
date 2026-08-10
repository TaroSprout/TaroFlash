import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

// Debounced so a resize burst (the mobile dock's live height, cascading from
// --edge-safe-padding) settles after scroll stops, instead of measuring
// scroll_margin from a window.scrollY snapshot that's still moving.
const RESIZE_DEBOUNCE_MS = 120

type Options = {
  /** Run right after each measurement — a window virtualizer needs an explicit `measure()` here so its own scroll tracking can't race the new margin. */
  onMeasure?: () => void
}

/**
 * Where a window-virtualized pane starts down the page, and how wide it is.
 *
 * Measures the pane's parent rather than the pane: a pane is transformed while
 * the deck view swaps modes, which would corrupt its own rect. Re-measures
 * whenever the page resizes.
 *
 * @param el - The pane itself; its parent is what actually gets measured.
 */
export function useParentScrollMargin(
  el: Readonly<Ref<HTMLElement | null>>,
  options: Options = {}
) {
  const scroll_margin = ref(0)
  const container_width = ref(0)
  // Gates a caller's first paint so a frame sized from an unmeasured container never shows.
  const measured = ref(false)

  let resize_observer: ResizeObserver | undefined
  let resize_timer: ReturnType<typeof setTimeout> | undefined

  function measure() {
    const container = el.value?.parentElement
    if (!container) return

    container_width.value = container.clientWidth
    scroll_margin.value = container.getBoundingClientRect().top + window.scrollY
    measured.value = true

    options.onMeasure?.()
  }

  function onBodyResize() {
    clearTimeout(resize_timer)
    resize_timer = setTimeout(measure, RESIZE_DEBOUNCE_MS)
  }

  onMounted(() => {
    measure()
    resize_observer = new ResizeObserver(onBodyResize)
    resize_observer.observe(document.body)
  })

  onBeforeUnmount(() => {
    clearTimeout(resize_timer)
    resize_observer?.disconnect()
  })

  return { scroll_margin, container_width, measured, measure }
}

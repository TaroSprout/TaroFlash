import { onBeforeUnmount, onMounted, reactive } from 'vue'

// How long a segment stays mounted after it leaves the intersection zone.
// Short enough to feel responsive during slow scroll; long enough to survive
// a fast fling past a short section without thrashing mount/unmount.
const UNMOUNT_DELAY_MS = 300

// 200% viewport margin keeps ~2 screen-heights of segments mounted above and
// below the visible area — enough buffer that normal scroll never sees a
// placeholder flicker into view.
const ROOT_MARGIN = '200% 0px'

/**
 * Mount/unmount transcript segments based on viewport proximity using an
 * IntersectionObserver. Segments within `ROOT_MARGIN` stay mounted; segments
 * further away unmount after `UNMOUNT_DELAY_MS` and are replaced by a height-
 * preserving placeholder.
 *
 * Call `registerEl(index, el)` via `:ref` on each segment's wrapper div.
 * Read `mounted.has(index)` in the template to decide real vs placeholder.
 * Use `placeholderStyle(index)` on the placeholder to preserve scroll height.
 *
 * @example
 * const seg_window = useSegmentWindow()
 * // template: <div :ref="el => seg_window.registerEl(i, el)">
 * //   <segment v-if="seg_window.mounted.has(i)" ... />
 * //   <div v-else :style="seg_window.placeholderStyle(i)" />
 * // </div>
 */
export function useSegmentWindow() {
  // Vue's reactive Set: .has() is tracked so templates re-render when entries change.
  const mounted = reactive(new Set<number>())
  // Last-measured height of each segment before it unmounted.
  const heights = new Map<number, number>()
  // Pending unmount timers — cancelled when the segment re-enters.
  const timers = new Map<number, ReturnType<typeof setTimeout>>()
  // Wrapper elements keyed by paragraph index, for unobserving on teardown.
  const wrappers = new Map<number, HTMLElement>()

  let io: IntersectionObserver | null = null

  function cancelTimer(index: number) {
    const t = timers.get(index)
    if (t !== undefined) {
      clearTimeout(t)
      timers.delete(index)
    }
  }

  onMounted(() => {
    io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = Number((entry.target as HTMLElement).dataset.windowIndex)
          if (isNaN(index)) continue

          if (entry.isIntersecting) {
            cancelTimer(index)
            mounted.add(index)
          } else {
            if (timers.has(index)) continue
            const el = wrappers.get(index)
            if (el) heights.set(index, el.offsetHeight)
            timers.set(
              index,
              setTimeout(() => {
                timers.delete(index)
                mounted.delete(index)
              }, UNMOUNT_DELAY_MS)
            )
          }
        }
      },
      { rootMargin: ROOT_MARGIN }
    )

    // Observe any wrappers that registered before the observer was ready
    // (registerEl fires in setup, onMounted fires after first render).
    wrappers.forEach((el) => io!.observe(el))
  })

  onBeforeUnmount(() => {
    io?.disconnect()
    io = null
    timers.forEach((t) => clearTimeout(t))
    timers.clear()
  })

  /**
   * Wire this to `:ref` on the wrapper div around each segment. Starts the
   * segment mounted and begins observing; on teardown (el = null) unobserves
   * and cancels any pending unmount.
   */
  function registerEl(index: number, el: HTMLElement | null) {
    if (el) {
      el.dataset.windowIndex = String(index)
      wrappers.set(index, el)
      mounted.add(index)
      io?.observe(el)
    } else {
      const prev = wrappers.get(index)
      if (prev) io?.unobserve(prev)
      wrappers.delete(index)
      cancelTimer(index)
    }
  }

  /**
   * Inline style for the placeholder div — sets minHeight to the last-measured
   * real segment height so scroll position is preserved. Falls back to 12rem
   * (matches the `contain-intrinsic-size` on the real segment) on first pass.
   */
  function placeholderStyle(index: number): { minHeight: string } {
    const h = heights.get(index)
    return { minHeight: h ? `${h}px` : '12rem' }
  }

  return { mounted, registerEl, placeholderStyle }
}

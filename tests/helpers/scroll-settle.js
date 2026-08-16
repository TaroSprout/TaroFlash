/**
 * Waits for a `scroll-region` handle to settle after a geometry change.
 *
 * `useScrollMetrics` (`src/components/layout-kit/scroll-region/use-scroll-metrics.ts`)
 * holds the handle back until the measured overflow has stayed put for its
 * `SETTLE_MS` (150ms at time of writing) — and ResizeObserver callbacks can
 * themselves lag a couple of animation frames behind the DOM mutation that
 * triggered them. 200ms clears both with room to spare; if a future bump to
 * `SETTLE_MS` outpaces this, every scroll-region handle assertion goes red
 * together and points straight back here.
 */
export async function waitForScrollSettle() {
  await new Promise((resolve) => requestAnimationFrame(resolve))
  await new Promise((resolve) => requestAnimationFrame(resolve))
  await new Promise((resolve) => setTimeout(resolve, 200))
}

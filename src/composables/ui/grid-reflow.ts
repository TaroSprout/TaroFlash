import { onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

/** How long a reflow's slot transition runs; pair it with a matching transition class. */
export const GRID_REFLOW_DURATION = 200

/**
 * Slots slide to their new positions whenever the item count changes — a delete leaves a
 * gap the survivors move into instead of jumping across it. A list arriving is not a
 * change: an empty grid filling up is skipped once, so a page load never reads as an edit.
 */
export function useGridReflow(count: MaybeRefOrGetter<number>) {
  const reflowing = ref(false)
  let reflow_timeout = 0
  // Items at setup mean the list already arrived, so the next change is a real edit.
  let arrived = toValue(count) > 0

  watch(
    () => toValue(count),
    (next) => {
      if (!arrived) {
        arrived = next > 0
        return
      }

      reflowing.value = true
      window.clearTimeout(reflow_timeout)
      reflow_timeout = window.setTimeout(() => {
        reflowing.value = false
      }, GRID_REFLOW_DURATION)
    }
  )

  onScopeDispose(() => window.clearTimeout(reflow_timeout))

  return { reflowing }
}

import { onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

/**
 * How long a reflow's slot transition runs. Callers pair this with a
 * `duration-200` transition class on the positioned cell.
 */
export const GRID_REFLOW_DURATION = 200

/**
 * Opens a short window, whenever `count` changes, in which an
 * absolutely-positioned grid should transition its cells to their new slots —
 * so a delete or a create slides the survivors across instead of teleporting
 * them.
 *
 * The window is deliberately narrow: a drag-drop reorder brings its own
 * lift/drop settle animation, and transitioning the resting position all the
 * time would fight it (the dropped card would visibly slide from its
 * pre-persist slot to its post-persist one). Only the item count moving is a
 * real reflow.
 */
export function useGridReflow(count: MaybeRefOrGetter<number>) {
  const reflowing = ref(false)
  let reflow_timeout = 0
  // The first firing is the initial query resolving, not a real reflow.
  let count_initialized = false

  watch(
    () => toValue(count),
    () => {
      if (!count_initialized) {
        count_initialized = true
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

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
 *
 * The list arriving is not. A grid whose items are still loading sits empty
 * and then fills in one step, and sliding every cell in from the first slot
 * would announce a page load as an edit — so an empty list filling up is
 * skipped, once, and every later change animates.
 */
export function useGridReflow(count: MaybeRefOrGetter<number>) {
  const reflowing = ref(false)
  let reflow_timeout = 0
  // Already holding items at setup means the list arrived before this grid
  // rendered, so the next change is a real edit — never assume the first one
  // is the load, or the first delete of the session is the one that jumps.
  let arrived = toValue(count) > 0

  watch(
    () => toValue(count),
    (next) => {
      // Empty until now: this is the list landing, not an edit to it.
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

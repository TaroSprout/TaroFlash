import { useMotionStore } from '@/stores/motion'

// Height tweens run off the compositor, so the active tier caps how many exist across
// every stage at once. Module-level, not per-stage — the budget is shared app-wide.
let running = 0

/**
 * Reserves one app-wide height-tween slot from the active tier's budget.
 *
 * Returns an idempotent release, or `null` when the budget is already spent — a
 * stage that gets `null` snaps its height change instead of tweening. On the
 * `minimal` tier the budget is zero, so this always returns `null`.
 */
export function reserveHeightTween(): (() => void) | null {
  const budget = useMotionStore().factors.height_tween_budget

  if (running >= budget) return null

  running++
  let released = false

  return () => {
    if (released) return
    released = true
    running--
  }
}

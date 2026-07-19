import { computed, reactive, shallowRef, type ComputedRef } from 'vue'
import { deepClone, deepEqual } from '@/utils/object'

export type Draft<T extends object> = {
  state: T
  is_dirty: ComputedRef<boolean>
  reset: () => void
  rebase: (keys?: (keyof T)[]) => void
}

/**
 * A single mutable draft over one whole row of data. `buildBase` returns the
 * last-saved shape (with defaults merged in, so `state` is always fully
 * populated); `state` is a deep reactive clone of it that forms/designers
 * mutate directly, including nested objects. Dirty-checking is clone-and-diff,
 * not write-capture — behaviourally identical for these small objects and far
 * simpler than a patch/Proxy layer, while keeping the state deeply mutable.
 *
 * @example
 * const draft = useDraft(() => buildDeckBase(deck))
 * draft.state.study_config.shuffle = true
 * if (draft.is_dirty.value) await save(draft.state)
 * draft.rebase() // adopt the saved state as the new baseline
 */
export function useDraft<T extends object>(buildBase: () => T): Draft<T> {
  // A ref rather than a plain variable so `rebase()`'s reassignment invalidates
  // the `is_dirty` computed — a bare closure swap wouldn't be tracked and the
  // stale `true` would stick until the next `state` mutation.
  const base = shallowRef(buildBase())
  const state = reactive(deepClone(base.value)) as T

  const is_dirty = computed(() => !deepEqual(state, base.value))

  /**
   * Restore `state` to the base by mutating it in place — nested object/array
   * identity is preserved so references already handed to child components
   * (e.g. a designer bound to `state.cover_config`) stay live.
   */
  function reset() {
    deepReplaceInPlace(state as Record<string, unknown>, base.value as Record<string, unknown>)
  }

  /**
   * Adopt the current `state` as the new base, e.g. after a successful save.
   * Pass `keys` to adopt only part of it — for a write that persisted a slice of
   * the row on its own, leaving the rest of the draft staged and still dirty.
   */
  function rebase(keys?: (keyof T)[]) {
    if (!keys) return void (base.value = deepClone(state))

    const next = deepClone(base.value)
    for (const key of keys) next[key] = deepClone(state[key])
    base.value = next
  }

  return { state, is_dirty, reset, rebase }
}

/**
 * Overwrite `target`'s contents with `source`, recursing into plain objects so
 * their identity survives. Keys absent from `source` are dropped; arrays and
 * primitives are replaced wholesale.
 */
function deepReplaceInPlace(target: Record<string, unknown>, source: Record<string, unknown>) {
  for (const key of Object.keys(target)) {
    if (!(key in source)) delete target[key]
  }

  for (const key of Object.keys(source)) {
    const next = source[key]
    const current = target[key]
    if (isPlainObject(next) && isPlainObject(current)) {
      deepReplaceInPlace(current, next)
    } else {
      target[key] = deepClone(next)
    }
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

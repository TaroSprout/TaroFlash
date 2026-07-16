import { computed, ref, watch, type Ref, type WritableComputedRef } from 'vue'

type Capped = number | null | undefined

export type UseCappedToggleResult = {
  /** Numeric value bound to a spinbox; shows `on_all_prefill()` while "all" is active. */
  spin_value: WritableComputedRef<number>
  /** True when the model is `null` ("all" / unlimited). */
  is_all: WritableComputedRef<boolean>
  /** Drive the spinbox: clamps and flips to `null` once it reaches `max`. */
  onSpin: (n: number) => void
}

/**
 * Pair a numeric model with an "all" toggle, where `null` means unlimited.
 * While "all" is active the spinbox displays `on_all_prefill()` (e.g. the
 * deck's card count) rather than a cached number — this keeps it honest when
 * `model` becomes `null` from outside (preset switch, reset-to-preset), not
 * just from the pill click. Toggling "all" off restores the last numeric
 * value the model held, or `on_all_prefill()` if it was never set (entering
 * already in "all" mode).
 *
 * @example
 * const { spin_value, is_all, onSpin } = useCappedToggle(model, 200, 50, () => deck.card_count)
 */
export function useCappedToggle(
  model: Ref<Capped>,
  max: number,
  default_value: number,
  on_all_prefill?: () => number | undefined
): UseCappedToggleResult {
  const fallback_max = () => on_all_prefill?.() ?? (Number.isFinite(max) ? max : default_value)

  const local = ref<number>(model.value ?? default_value)
  const last_numeric = ref<number | null>(model.value ?? null)

  watch(model, (v) => {
    if (v != null) {
      local.value = v
      last_numeric.value = v
    }
  })

  const is_all = computed({
    get: () => model.value === null,
    set: (on: boolean) => {
      if (on) {
        model.value = null
        return
      }

      const restored = last_numeric.value ?? fallback_max()
      local.value = restored
      model.value = restored
    }
  })

  const spin_value = computed({
    get: () => (is_all.value ? fallback_max() : local.value),
    set: (n: number) => onSpin(n)
  })

  function onSpin(n: number) {
    local.value = n
    model.value = n >= max ? null : n
  }

  return { spin_value, is_all, onSpin }
}

import type { Ref } from 'vue'

type Bounds = {
  min: () => number
  max: () => number
}

export type UseNumericInputResult = {
  /** Clamp `n` into `[min, max]`. */
  clamp: (n: number) => number
  /** Bind to `<input @input>`: parses the raw text and writes the clamped number into `value`. */
  onInput: (e: Event) => void
  /** Bind to `<input @beforeinput>`: blocks non-numeric characters (allows `-` when `min < 0`). */
  onBeforeInput: (e: InputEvent) => void
  /** Bind to `<input @focus>`: selects the entire field for quick replacement. */
  onFocus: (e: FocusEvent) => void
  /** Bind to `<input @blur>`: normalizes blank/garbage input by snapping back to the clamped model value. */
  onBlur: (e: Event) => void
}

/**
 * Bind a `<input type="text" inputmode="numeric">` to a numeric model. Handles
 * masked entry (digits only, optional minus), focus-to-select, and blur
 * normalization so partial/empty input always settles back to a clamped number.
 *
 * @param value Model ref to read from / write into.
 * @param bounds Getters for `min` and `max` so the composable stays reactive
 *   when the parent's bounds are reactive props.
 *
 * @example
 * const value = defineModel<number>('value', { required: true })
 * const handlers = useNumericInput(value, { min: () => min, max: () => max })
 */
export function useNumericInput(value: Ref<number>, bounds: Bounds): UseNumericInputResult {
  function clamp(n: number) {
    return Math.min(bounds.max(), Math.max(bounds.min(), n))
  }

  function onInput(e: Event) {
    const raw = (e.target as HTMLInputElement).value
    if (raw === '') return
    const n = Number(raw)
    if (!Number.isFinite(n)) return
    value.value = clamp(n)
  }

  function onBeforeInput(e: InputEvent) {
    if (e.data == null) return
    const allow_minus = bounds.min() < 0
    for (const ch of e.data) {
      if (ch >= '0' && ch <= '9') continue
      if (ch === '-' && allow_minus) continue
      e.preventDefault()
      return
    }
  }

  function onFocus(e: FocusEvent) {
    ;(e.target as HTMLInputElement).select()
  }

  function onBlur(e: Event) {
    const el = e.target as HTMLInputElement
    const n = Number(el.value)
    if (!Number.isFinite(n) || el.value === '') {
      el.value = String(value.value)
      return
    }
    const clamped = clamp(n)
    value.value = clamped
    el.value = String(clamped)
  }

  return { clamp, onInput, onBeforeInput, onFocus, onBlur }
}

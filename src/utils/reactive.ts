/**
 * Overwrite a `reactive()` object's contents with `source` in place —
 * dropping any keys `target` has that `source` doesn't, so callers don't
 * need `target` and `source` to already share identical key sets.
 */
export function replaceReactiveContents<T extends object>(target: T, source: T) {
  for (const key of Object.keys(target) as (keyof T)[]) delete target[key]
  Object.assign(target, source)
}

/**
 * Takes a detached snapshot of reactive data, for holding on to what a form
 * looked like before the member started editing.
 *
 * Plain data only — Dates, Maps, class instances, and cycles do not survive.
 */
export function deepClone<T>(value: T): T {
  if (typeof value !== 'object' || value === null) return value
  if (Array.isArray(value)) return value.map((item) => deepClone(item)) as T

  const out: Record<string, unknown> = {}
  for (const key of Object.keys(value as Record<string, unknown>)) {
    out[key] = deepClone((value as Record<string, unknown>)[key])
  }
  return out as T
}

/**
 * Whether two plain values hold the same data, whatever order their keys are
 * in. Use it for "has the member changed anything" checks.
 *
 * A missing key and an explicitly empty one count as equal, so filling in
 * defaults doesn't make an untouched form look edited.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((item, index) => deepEqual(item, b[index]))
  }

  const a_keys = definedKeys(a as Record<string, unknown>)
  const b_keys = definedKeys(b as Record<string, unknown>)
  if (a_keys.length !== b_keys.length) return false

  return a_keys.every((key) =>
    deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
  )
}

/** Own keys of `obj` whose value isn't `undefined`. */
function definedKeys(obj: Record<string, unknown>): string[] {
  return Object.keys(obj).filter((key) => obj[key] !== undefined)
}

/**
 * Deep-clone a plain data value (objects, arrays, primitives), reading through
 * Vue reactive proxies to produce a detached, non-reactive snapshot. Used to
 * capture a draft's base state so later mutations don't write back into it.
 * Plain-data only — no Dates, Maps, class instances, or cycles.
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
 * Structural equality for plain data. Keys whose value is `undefined` are
 * ignored on both sides, so a merged-in default that leaves a field `undefined`
 * doesn't read as a change. Replaces the fragile key-order `JSON.stringify`
 * comparison the editors used for dirty-checking.
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

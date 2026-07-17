import { describe, test, expect } from 'vite-plus/test'
import { reactive } from 'vue'
import { deepClone, deepEqual } from '@/utils/object'

describe('deepClone', () => {
  test('returns primitives as-is', () => {
    expect(deepClone(1)).toBe(1)
    expect(deepClone('a')).toBe('a')
    expect(deepClone(null)).toBeNull()
    expect(deepClone(undefined)).toBeUndefined()
  })

  test('deep-clones a plain object, producing a detached copy', () => {
    const source = { a: 1, nested: { b: 2 } }
    const clone = deepClone(source)

    clone.nested.b = 99

    expect(clone).toEqual({ a: 1, nested: { b: 99 } })
    expect(source.nested.b).toBe(2)
  })

  test('deep-clones arrays, including arrays of objects', () => {
    const source = [{ a: 1 }, { a: 2 }]
    const clone = deepClone(source)

    clone[0].a = 99

    expect(clone).toEqual([{ a: 99 }, { a: 2 }])
    expect(source[0].a).toBe(1)
  })

  test('reads through a Vue reactive proxy to produce a plain, detached snapshot', () => {
    const source = reactive({ nested: { b: 2 } })
    const clone = deepClone(source)

    source.nested.b = 100

    expect(clone.nested.b).toBe(2)
  })
})

describe('deepEqual', () => {
  test('primitives compare by value', () => {
    expect(deepEqual(1, 1)).toBe(true)
    expect(deepEqual(1, 2)).toBe(false)
    expect(deepEqual('a', 'a')).toBe(true)
    expect(deepEqual(null, null)).toBe(true)
  })

  test('one side null/non-object short-circuits to false when the other is an object', () => {
    expect(deepEqual(null, {})).toBe(false)
    expect(deepEqual({}, null)).toBe(false)
    expect(deepEqual(1, {})).toBe(false)
  })

  test('arrays compare element-wise and by length', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false)
    expect(deepEqual([{ a: 1 }], [{ a: 1 }])).toBe(true)
    expect(deepEqual([{ a: 1 }], [{ a: 2 }])).toBe(false)
  })

  test('an array never equals a plain object', () => {
    expect(deepEqual([1, 2], { 0: 1, 1: 2 })).toBe(false)
  })

  test('plain objects compare structurally, independent of key order', () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true)
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false)
  })

  test('nested objects compare recursively', () => {
    expect(deepEqual({ nested: { b: 2 } }, { nested: { b: 2 } })).toBe(true)
    expect(deepEqual({ nested: { b: 2 } }, { nested: { b: 3 } })).toBe(false)
  })

  test('undefined-valued keys are ignored on both sides [obligation]', () => {
    expect(deepEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true)
    expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(true)
  })

  test('null-valued keys COUNT as a real value, unlike undefined [obligation]', () => {
    expect(deepEqual({ a: null }, {})).toBe(false)
    expect(deepEqual({}, { a: null })).toBe(false)
    expect(deepEqual({ a: null }, { a: null })).toBe(true)
    expect(deepEqual({ a: null }, { a: 1 })).toBe(false)
  })
})

import { describe, test, expect } from 'vite-plus/test'
import { reactive } from 'vue'
import { replaceReactiveContents } from '@/utils/reactive'

describe('replaceReactiveContents [obligation]', () => {
  test('replaces target contents to exactly match source — drops missing keys, updates shared keys, adds new keys [obligation]', () => {
    const target = reactive({ a: 1, b: 2 })
    const source = { b: 20, c: 3 }

    replaceReactiveContents(target, source)

    expect(target).toEqual({ b: 20, c: 3 })
    expect('a' in target).toBe(false)
  })

  test('does not mutate the source object', () => {
    const target = reactive({ a: 1 })
    const source = { b: 2 }

    replaceReactiveContents(target, source)

    expect(source).toEqual({ b: 2 })
  })

  test('reactive tracking still works on the resulting target', () => {
    const target = reactive({ a: 1 })
    replaceReactiveContents(target, { a: 99 })

    expect(target.a).toBe(99)
    target.a = 100
    expect(target.a).toBe(100)
  })
})

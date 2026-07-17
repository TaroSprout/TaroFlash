import { describe, test, expect } from 'vite-plus/test'
import { useDraft } from '@/composables/draft'

describe('useDraft', () => {
  describe('is_dirty', () => {
    test('is false right after creation', () => {
      const { is_dirty } = useDraft(() => ({ a: 1, nested: { b: 2 } }))
      expect(is_dirty.value).toBe(false)
    })

    test('flips to true when a top-level field is mutated', () => {
      const { state, is_dirty } = useDraft(() => ({ a: 1 }))
      state.a = 2
      expect(is_dirty.value).toBe(true)
    })

    test('flips to true when a nested field is mutated', () => {
      const { state, is_dirty } = useDraft(() => ({ nested: { b: 2 } }))
      state.nested.b = 3
      expect(is_dirty.value).toBe(true)
    })

    test('is exact — restoring the original value after a mutation clears is_dirty again [obligation]', () => {
      const { state, is_dirty } = useDraft(() => ({ a: 1, nested: { b: 2 } }))

      state.a = 2
      expect(is_dirty.value).toBe(true)

      state.a = 1
      expect(is_dirty.value).toBe(false)

      state.nested.b = 99
      expect(is_dirty.value).toBe(true)

      state.nested.b = 2
      expect(is_dirty.value).toBe(false)
    })

    test('does not care about key order, unlike a JSON.stringify comparison', () => {
      const { state, is_dirty } = useDraft(() => ({ a: 1, b: 2 }))

      // Reassign the whole object with keys in a different order but the
      // same values — a naive JSON.stringify diff would flag this as dirty.
      Object.assign(state, { b: 2, a: 1 })

      expect(is_dirty.value).toBe(false)
    })
  })

  describe('reset', () => {
    test('restores state to the base values', () => {
      const { state, reset } = useDraft(() => ({ a: 1, nested: { b: 2 } }))

      state.a = 99
      state.nested.b = 100
      reset()

      expect(state.a).toBe(1)
      expect(state.nested.b).toBe(2)
    })

    test('clears is_dirty', () => {
      const { state, is_dirty, reset } = useDraft(() => ({ a: 1 }))

      state.a = 2
      expect(is_dirty.value).toBe(true)

      reset()

      expect(is_dirty.value).toBe(false)
    })

    test('preserves nested object identity — a reference captured before reset still reads the reset values [obligation]', () => {
      const { state, reset } = useDraft(() => ({ nested: { b: 2 } }))

      const nested_ref = state.nested
      state.nested.b = 999

      reset()

      expect(nested_ref.b).toBe(2)
      expect(nested_ref).toBe(state.nested)
    })

    test('drops keys absent from the base', () => {
      const { state, reset } = useDraft(() => ({ a: 1 }))

      state.extra = 'added'
      reset()

      expect('extra' in state).toBe(false)
    })
  })

  describe('rebase', () => {
    test('adopts the current state as the new base, so is_dirty goes false without a further mutation [obligation]', () => {
      const { state, is_dirty, rebase } = useDraft(() => ({ a: 1 }))

      state.a = 2
      expect(is_dirty.value).toBe(true)

      rebase()

      expect(is_dirty.value).toBe(false)
    })

    test('a subsequent revert-to-pre-rebase value now reads as dirty', () => {
      const { state, is_dirty, rebase } = useDraft(() => ({ a: 1 }))

      state.a = 2
      rebase()
      expect(is_dirty.value).toBe(false)

      state.a = 1
      expect(is_dirty.value).toBe(true)
    })
  })
})

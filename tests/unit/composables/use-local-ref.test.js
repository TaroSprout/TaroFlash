import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { nextTick } from 'vue'

import { useLocalRef } from '@/composables/storage/local-ref'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

describe('useLocalRef', () => {
  // ── First-run fallback ────────────────────────────────────────────────────

  test('returns defaultValue when the key is absent in localStorage [obligation]', () => {
    const state = useLocalRef('test-key', 'fallback')
    expect(state.value).toBe('fallback')
  })

  test('returns defaultValue for object defaults when key is absent', () => {
    const state = useLocalRef('test-obj', { count: 0 })
    expect(state.value).toEqual({ count: 0 })
  })

  // ── Rehydration ───────────────────────────────────────────────────────────

  test('returns the stored value (JSON-parsed) when the key exists [obligation]', () => {
    localStorage.setItem('test-key', JSON.stringify('stored-value'))
    const state = useLocalRef('test-key', 'fallback')
    expect(state.value).toBe('stored-value')
  })

  test('rehydrates a stored number', () => {
    localStorage.setItem('test-num', JSON.stringify(42))
    const state = useLocalRef('test-num', 0)
    expect(state.value).toBe(42)
  })

  test('rehydrates a stored object', () => {
    localStorage.setItem('test-obj', JSON.stringify({ foo: 'bar' }))
    const state = useLocalRef('test-obj', {})
    expect(state.value).toEqual({ foo: 'bar' })
  })

  // ── Corrupt-storage resilience ────────────────────────────────────────────

  test('falls back to defaultValue when stored JSON is malformed [obligation]', () => {
    localStorage.setItem('test-key', 'not valid json {{')
    const state = useLocalRef('test-key', 'default-safe')
    expect(state.value).toBe('default-safe')
  })

  test('falls back gracefully when stored value is truncated', () => {
    localStorage.setItem('test-key', '{"incomplete":')
    const state = useLocalRef('test-key', 99)
    expect(state.value).toBe(99)
  })

  // ── Deep-watch persistence ────────────────────────────────────────────────

  test('writes the new value to localStorage (JSON-stringified) when the ref changes [obligation]', async () => {
    const state = useLocalRef('test-key', 'initial')
    state.value = 'updated'
    await nextTick()
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify('updated'))
  })

  test('persists a numeric value update to localStorage', async () => {
    const state = useLocalRef('test-num', 0)
    state.value = 7
    await nextTick()
    expect(localStorage.getItem('test-num')).toBe(JSON.stringify(7))
  })

  test('persists an object mutation to localStorage (deep watch)', async () => {
    const state = useLocalRef('test-obj', { count: 0 })
    state.value.count = 5
    await nextTick()
    expect(JSON.parse(localStorage.getItem('test-obj'))).toEqual({ count: 5 })
  })

  // ── Isolation ─────────────────────────────────────────────────────────────

  test('two refs with different keys are isolated', async () => {
    const a = useLocalRef('key-a', 'a')
    const b = useLocalRef('key-b', 'b')
    a.value = 'changed-a'
    await nextTick()
    expect(b.value).toBe('b')
    expect(localStorage.getItem('key-b')).toBe(null)
  })
})

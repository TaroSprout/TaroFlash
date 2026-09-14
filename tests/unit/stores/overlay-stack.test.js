import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { setActivePinia, createPinia } from 'pinia'
import { useOverlayStore } from '@/stores/overlay-stack'

function makeEntry(id, overrides = {}) {
  return {
    id,
    component: {},
    props: {},
    presentation: 'dialog',
    settle: vi.fn(),
    markEntered: vi.fn(),
    ...overrides
  }
}

describe('useOverlayStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  test('starts with an empty entries list and an undefined top', () => {
    const store = useOverlayStore()
    expect(store.entries).toEqual([])
    expect(store.top).toBeUndefined()
  })

  test('push appends an entry and top tracks the most recently pushed one', () => {
    const store = useOverlayStore()
    const a = makeEntry('a')
    const b = makeEntry('b')

    store.push(a)
    expect(store.top.id).toBe('a')

    store.push(b)
    expect(store.top.id).toBe('b')
    expect(store.entries).toHaveLength(2)
  })

  test('remove settles the entry with the given outcome and drops it from entries', () => {
    const store = useOverlayStore()
    const entry = makeEntry('a')
    store.push(entry)

    store.remove('a', 'the-outcome')

    expect(entry.settle).toHaveBeenCalledWith('the-outcome')
    expect(store.entries).toHaveLength(0)
  })

  test('remove with no outcome settles with undefined', () => {
    const store = useOverlayStore()
    const entry = makeEntry('a')
    store.push(entry)

    store.remove('a')

    expect(entry.settle).toHaveBeenCalledWith(undefined)
  })

  test('remove is a no-op for an id that is not on the stack', () => {
    const store = useOverlayStore()
    const entry = makeEntry('a')
    store.push(entry)

    store.remove('missing')

    expect(entry.settle).not.toHaveBeenCalled()
    expect(store.entries).toHaveLength(1)
  })

  test('closeAll settles every entry with undefined and empties the stack', () => {
    const store = useOverlayStore()
    const a = makeEntry('a')
    const b = makeEntry('b')
    store.push(a)
    store.push(b)

    store.closeAll()

    expect(a.settle).toHaveBeenCalledWith(undefined)
    expect(b.settle).toHaveBeenCalledWith(undefined)
    expect(store.entries).toHaveLength(0)
  })

  test('closeAll on an empty stack settles nothing and stays empty', () => {
    const store = useOverlayStore()
    store.closeAll()
    expect(store.entries).toHaveLength(0)
  })
})

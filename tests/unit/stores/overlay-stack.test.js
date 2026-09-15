import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { ref } from 'vue'
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

  // ── push must not deep-reactive-wrap props ─────────────────────
  // Pinia's `entries` is a `reactive()` array — without `markRaw` on the
  // pushed props bundle, storing it deep-wraps every nested object,
  // including a ref-carrying bundle like mobile-editor's `api`. Vue
  // auto-unwraps a ref the moment it's read as a property of a reactive
  // proxy, so a consumer reading `entry.props.api.cards.value` would get
  // `undefined` — the ref has already collapsed into its raw array value at
  // store-write time, before any consumer even runs.

  test('push keeps a ref nested inside props live — reading it after push resolves through the same ref, not a snapshot', () => {
    const store = useOverlayStore()
    const cards = ref(['a', 'b'])
    const api = { cards }
    const entry = makeEntry('a', { props: { api } })

    store.push(entry)

    const stored_cards = store.entries[0].props.api.cards
    expect(stored_cards).toBe(cards)
    expect(stored_cards.value).toEqual(['a', 'b'])

    cards.value = ['a', 'b', 'c']
    expect(store.entries[0].props.api.cards.value).toEqual(['a', 'b', 'c'])
  })
})

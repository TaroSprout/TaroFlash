import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { createApp, nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

const { mockRecede, mockRestore } = vi.hoisted(() => ({
  mockRecede: vi.fn(),
  mockRestore: vi.fn()
}))

vi.mock('@/utils/animations/modal', () => ({
  recedeModal: mockRecede,
  restoreModal: mockRestore
}))

import { useOverlayRecede } from '@/components/overlay/use-overlay-recede'
import { useOverlayStore } from '@/stores/overlay-stack'

function makeEntry(id) {
  return {
    id,
    component: {},
    props: {},
    presentation: 'dialog',
    settle: vi.fn(),
    markEntered: vi.fn()
  }
}

function makeEl() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

let app

function mountRecede() {
  let result
  app = createApp({
    setup() {
      result = useOverlayRecede()
      return () => null
    }
  })
  app.mount(document.createElement('div'))
  return result
}

beforeEach(() => {
  setActivePinia(createPinia())
  mockRecede.mockClear()
  mockRestore.mockClear()
})

afterEach(() => {
  app?.unmount()
  app = undefined
})

describe('useOverlayRecede', () => {
  test('a lone top entry is never receded', async () => {
    const store = useOverlayStore()
    const { receded_ids, setOverlayEl } = mountRecede()

    store.push(makeEntry('a'))
    setOverlayEl('a', makeEl())
    await nextTick()

    expect(receded_ids.has('a')).toBe(false)
    expect(mockRecede).not.toHaveBeenCalled()
  })

  test('pushing a second entry recedes everything below the new top', async () => {
    const store = useOverlayStore()
    const { receded_ids, setOverlayEl } = mountRecede()

    store.push(makeEntry('a'))
    setOverlayEl('a', makeEl())
    await nextTick()

    store.push(makeEntry('b'))
    setOverlayEl('b', makeEl())
    await nextTick()

    expect(receded_ids.has('a')).toBe(true)
    expect(receded_ids.has('b')).toBe(false)
    expect(mockRecede).toHaveBeenCalledTimes(1)
  })

  test('removing the top entry restores the one that becomes top again', async () => {
    const store = useOverlayStore()
    const { receded_ids, setOverlayEl } = mountRecede()

    store.push(makeEntry('a'))
    setOverlayEl('a', makeEl())
    await nextTick()
    store.push(makeEntry('b'))
    setOverlayEl('b', makeEl())
    await nextTick()

    store.remove('b')
    await nextTick()

    expect(receded_ids.has('a')).toBe(false)
    expect(mockRestore).toHaveBeenCalledTimes(1)
  })

  test('getOverlayEl returns undefined for an id with no registered element', () => {
    const { getOverlayEl } = mountRecede()
    expect(getOverlayEl('missing')).toBeUndefined()
    expect(getOverlayEl(undefined)).toBeUndefined()
  })

  test('setOverlayEl(id, null) forgets the element and clears its receded state', async () => {
    const store = useOverlayStore()
    const { receded_ids, setOverlayEl, getOverlayEl } = mountRecede()

    store.push(makeEntry('a'))
    setOverlayEl('a', makeEl())
    store.push(makeEntry('b'))
    setOverlayEl('b', makeEl())
    await nextTick()

    expect(receded_ids.has('a')).toBe(true)

    setOverlayEl('a', null)

    expect(getOverlayEl('a')).toBeUndefined()
    expect(receded_ids.has('a')).toBe(false)
  })

  test('a batch push of multiple entries settles correctly, not assuming one push at a time', async () => {
    const store = useOverlayStore()
    const { receded_ids, setOverlayEl } = mountRecede()

    store.push(makeEntry('a'))
    setOverlayEl('a', makeEl())
    store.push(makeEntry('b'))
    setOverlayEl('b', makeEl())
    store.push(makeEntry('c'))
    setOverlayEl('c', makeEl())
    await nextTick()

    expect(receded_ids.has('a')).toBe(true)
    expect(receded_ids.has('b')).toBe(true)
    expect(receded_ids.has('c')).toBe(false)
  })
})

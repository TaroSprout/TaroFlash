import { describe, test, expect, beforeEach, afterEach } from 'vite-plus/test'
import {
  STORAGE_KEY,
  STORAGE_VERSION,
  defaultState,
  loadState,
  saveState,
  structuredCopy
} from '@/views/admin/color-page/state'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

describe('state — loadState with no save', () => {
  test('returns the default state when nothing is stored', () => {
    expect(loadState()).toEqual(defaultState())
  })

  test('returns the default state when the stored JSON is malformed', () => {
    localStorage.setItem(STORAGE_KEY, 'not valid json {{')
    expect(loadState()).toEqual(defaultState())
  })
})

describe('state — loadState version guard [obligation]', () => {
  test('a save written against the wrong version restores the defaults', () => {
    const defaults = defaultState()
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: STORAGE_VERSION + 1,
        state: { ...defaults, backdrops: { light: 'white', dark: 'black' } }
      })
    )

    expect(loadState()).toEqual(defaults)
  })
})

describe('state — loadState drops dead shade ids [obligation]', () => {
  test('a role pointing at a shade id that no longer exists is dropped, valid roles kept', () => {
    const defaults = defaultState()
    const saved = structuredCopy(defaults)
    saved.roles.light.page.surface = 'dead-shade-id'
    saved.roles.light.page.well = 'white'

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, state: saved }))

    const restored = loadState()
    expect(restored.roles.light.page.surface).toBe(defaults.roles.light.page.surface)
    expect(restored.roles.light.page.well).toBe('white')
  })

  test('a backdrop pointing at a shade id that no longer exists is dropped', () => {
    const defaults = defaultState()
    const saved = structuredCopy(defaults)
    saved.backdrops.light = 'dead-shade-id'

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, state: saved }))

    expect(loadState().backdrops.light).toBe(null)
  })
})

describe('state — loadState drops dead role keys [obligation]', () => {
  test('a saved role name no longer in the role catalog is ignored, real roles still restore', () => {
    const defaults = defaultState()
    const saved = structuredCopy(defaults)
    saved.roles.light.page['dead-role'] = 'white'
    saved.roles.light.page.ink = 'white'

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, state: saved }))

    const restored = loadState()
    expect(restored.roles.light.page['dead-role']).toBeUndefined()
    expect(restored.roles.light.page.ink).toBe('white')
  })
})

describe('state — loadState keeps shipped shades the save never mentions', () => {
  test('a save with an empty shade list still restores every shipped shade', () => {
    const saved = { ...defaultState(), shades: [] }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, state: saved }))

    expect(loadState().shades.length).toBe(defaultState().shades.length)
  })
})

describe('state — loadState malformed-shape guards', () => {
  test('a non-array shades value is ignored, defaults kept', () => {
    const saved = { ...defaultState(), shades: 'not-an-array' }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, state: saved }))

    expect(loadState().shades).toEqual(defaultState().shades)
  })

  test('a non-object roles value is ignored, defaults kept', () => {
    const saved = { ...defaultState(), roles: 'not-an-object' }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, state: saved }))

    expect(loadState().roles).toEqual(defaultState().roles)
  })

  test('a non-object per-mode roles entry is ignored, other modes still restore', () => {
    const defaults = defaultState()
    const saved = structuredCopy(defaults)
    saved.roles.light = 'not-an-object'
    saved.roles.dark.page.ink = 'white'

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, state: saved }))

    const restored = loadState()
    expect(restored.roles.light).toEqual(defaults.roles.light)
    expect(restored.roles.dark.page.ink).toBe('white')
  })

  test('a non-object backdrops value is ignored, defaults kept', () => {
    const saved = { ...defaultState(), backdrops: 'not-an-object' }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, state: saved }))

    expect(loadState().backdrops).toEqual(defaultState().backdrops)
  })

  test('a non-object elements value is ignored, defaults kept', () => {
    const saved = { ...defaultState(), elements: 'not-an-object' }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, state: saved }))

    expect(loadState().elements).toEqual(defaultState().elements)
  })

  test('a non-object per-element binding is skipped, other elements still restore', () => {
    const defaults = defaultState()
    const saved = structuredCopy(defaults)
    saved.elements.canvas = 'not-an-object'
    saved.elements.title = { bg: null, text: 'ink-muted' }

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, state: saved }))

    const restored = loadState()
    expect(restored.elements.canvas).toEqual(defaults.elements.canvas)
    expect(restored.elements.title.text).toBe('ink-muted')
  })

  test('a role explicitly saved as null clears the role', () => {
    const defaults = defaultState()
    const saved = structuredCopy(defaults)
    saved.roles.light.page.ink = null

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, state: saved }))

    expect(loadState().roles.light.page.ink).toBe(null)
  })
})

describe('state — saveState / loadState round trip', () => {
  test('a state written by saveState is read back unchanged by loadState', () => {
    const state = defaultState()
    state.shades[0].name = 'renamed'

    saveState(state)

    expect(loadState().shades[0].name).toBe('renamed')
  })
})

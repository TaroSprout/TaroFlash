import { describe, test, expect, beforeEach } from 'vite-plus/test'
import {
  defaultState,
  loadState,
  saveState,
  STORAGE_KEY,
  STORAGE_VERSION
} from '@/views/admin/color-page/state'

describe('state', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('loadState with nothing saved returns the defaults', () => {
    expect(loadState()).toEqual(defaultState())
  })

  test('a save written before the identity shades existed loads and gains them', () => {
    const partial = defaultState()
    // Simulate an older save that only ever knew about the neutral shades — no accent family at all.
    partial.shades = partial.shades.filter((shade) => shade.family !== 'blue')
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, state: partial }))

    const loaded = loadState()
    const blue_ids = loaded.shades.filter((shade) => shade.family === 'blue').map((s) => s.id)

    expect(blue_ids.length).toBeGreaterThan(0)
  })

  test('unknown shade ids in a saved role binding are dropped', () => {
    const saved = defaultState()
    saved.roles.light.page.surface = 'shade-that-no-longer-exists'
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, state: saved }))

    const loaded = loadState()
    // Dropped rather than kept means the default binding for that slot survives instead of the bogus id.
    expect(loaded.roles.light.page.surface).not.toBe('shade-that-no-longer-exists')
    expect(loaded.roles.light.page.surface).toBe(defaultState().roles.light.page.surface)
  })

  test('a null role binding in the save is honoured as unanswered', () => {
    const saved = defaultState()
    saved.roles.light.page.surface = null
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, state: saved }))

    expect(loadState().roles.light.page.surface).toBeNull()
  })

  test('a wrong version falls back to defaults', () => {
    const saved = defaultState()
    saved.shades[0].name = 'tampered'
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION + 1, state: saved })
    )

    expect(loadState()).toEqual(defaultState())
  })

  test('malformed JSON in storage falls back to defaults', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(loadState()).toEqual(defaultState())
  })

  test('saveState round-trips through loadState unchanged', () => {
    const state = defaultState()
    state.shades[0].name = 'renamed-white'
    saveState(state)

    expect(loadState().shades[0].name).toBe('renamed-white')
  })
})

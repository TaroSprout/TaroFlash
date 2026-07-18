import { describe, test, expect, beforeEach } from 'vite-plus/test'
import { nextTick } from 'vue'
import {
  usePersistedSession,
  readPersistedSession,
  clearPersistedSession
} from '@/views/study-session/composables/session-persistence'

const STORAGE_KEY = 'study-session'

beforeEach(() => {
  sessionStorage.clear()
})

function makeSnapshot(overrides = {}) {
  return {
    deck_ids: [1],
    card_ids: [10, 11],
    results: [],
    completed: false,
    ...overrides
  }
}

describe('usePersistedSession', () => {
  test('returns undefined when nothing has been persisted yet', () => {
    expect(usePersistedSession().value).toBeUndefined()
  })

  test('writing .value persists to sessionStorage under the study-session key', async () => {
    const persisted = usePersistedSession()
    persisted.value = makeSnapshot()
    await nextTick()

    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY))).toEqual(makeSnapshot())
  })

  test('a fresh usePersistedSession() call reads the previously written snapshot', async () => {
    usePersistedSession().value = makeSnapshot({ completed: true })
    await nextTick()

    expect(usePersistedSession().value).toEqual(makeSnapshot({ completed: true }))
  })
})

describe('readPersistedSession', () => {
  test('returns undefined when nothing was ever written', () => {
    expect(readPersistedSession()).toBeUndefined()
  })

  test('returns the persisted snapshot after a write', async () => {
    usePersistedSession().value = makeSnapshot()
    await nextTick()

    expect(readPersistedSession()).toEqual(makeSnapshot())
  })

  test('returns undefined after clearPersistedSession() [obligation]', async () => {
    usePersistedSession().value = makeSnapshot()
    await nextTick()
    expect(readPersistedSession()).toBeDefined()

    clearPersistedSession()

    expect(readPersistedSession()).toBeUndefined()
  })

  // ── Stale snapshot rejection [obligation] ──────────────────────────────────
  // An older build's sessionStorage shape (mode/config_override instead of a
  // boolean `completed`) must never be resumed from — reading it clears the
  // key and returns undefined instead of handing back a stale-shaped object.

  test('clears and returns undefined for an old-shape snapshot (mode + config_override, no completed) [obligation]', async () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        deck_ids: [1],
        card_ids: [10],
        results: [],
        mode: 'studying',
        config_override: { shuffle: true }
      })
    )

    expect(readPersistedSession()).toBeUndefined()
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  test('rejects a snapshot missing deck_ids entirely [obligation]', () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ card_ids: [10], results: [], completed: false })
    )

    expect(readPersistedSession()).toBeUndefined()
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  test('rejects a snapshot whose completed field is not a boolean [obligation]', () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ deck_ids: [1], card_ids: [10], results: [], completed: 'studying' })
    )

    expect(readPersistedSession()).toBeUndefined()
  })

  test('accepts a valid current-shape snapshot with completed: true', async () => {
    usePersistedSession().value = makeSnapshot({ completed: true })
    await nextTick()

    expect(readPersistedSession()).toEqual(makeSnapshot({ completed: true }))
  })
})

describe('clearPersistedSession [obligation]', () => {
  test('removes the sessionStorage key entirely, not just resets to a JSON "undefined" string [obligation]', async () => {
    usePersistedSession().value = makeSnapshot()
    await nextTick()
    expect(sessionStorage.getItem(STORAGE_KEY)).not.toBeNull()

    clearPersistedSession()

    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})

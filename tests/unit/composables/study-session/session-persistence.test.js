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
    config_override: undefined,
    card_ids: [10, 11],
    results: [],
    mode: 'studying',
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
    usePersistedSession().value = makeSnapshot({ mode: 'completed' })
    await nextTick()

    expect(usePersistedSession().value).toEqual(makeSnapshot({ mode: 'completed' }))
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

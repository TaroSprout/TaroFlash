import type { CardReviewResult } from './session-core'

const STORAGE_KEY = 'study-session'

export type PersistedSession = {
  deck_ids: number[]
  config_override?: Partial<DeckConfig>
  card_ids: number[]
  results: CardReviewResult[]
  mode: 'studying' | 'completed'
}

/**
 * Session-local (tab-scoped) snapshot used to resume a study session across a
 * page refresh. Only ids + review results are stored — display text and FSRS
 * preview data are re-fetched, not duplicated.
 */
export function readPersistedSession(): PersistedSession | undefined {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (!raw) return undefined

  try {
    return JSON.parse(raw) as PersistedSession
  } catch {
    return undefined
  }
}

export function writePersistedSession(session: PersistedSession) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearPersistedSession() {
  sessionStorage.removeItem(STORAGE_KEY)
}

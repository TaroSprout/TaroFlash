import { useSessionRef } from '@/composables/storage/session-ref'
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
 * preview data are re-fetched, not duplicated. Backed by `useSessionRef` so
 * assigning `.value` handles the JSON serialization/parsing.
 */
export function usePersistedSession() {
  return useSessionRef<PersistedSession | undefined>(STORAGE_KEY, undefined)
}

/** One-shot read, for call sites that don't need a live reactive ref. */
export function readPersistedSession(): PersistedSession | undefined {
  return usePersistedSession().value
}

export function clearPersistedSession() {
  sessionStorage.removeItem(STORAGE_KEY)
}

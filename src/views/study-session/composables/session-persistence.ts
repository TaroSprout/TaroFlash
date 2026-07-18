import { useSessionRef } from '@/composables/storage/session-ref'
import type { CardReviewResult } from './session-engine'

const STORAGE_KEY = 'study-session'

export type PersistedSession = {
  deck_ids: number[]
  card_ids: number[]
  results: CardReviewResult[]
  completed: boolean
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

/** Narrow an unknown parsed snapshot to the current shape; reject stale ones. */
function isValidSnapshot(value: unknown): value is PersistedSession {
  if (!value || typeof value !== 'object') return false
  const snapshot = value as Record<string, unknown>
  return (
    Array.isArray(snapshot.deck_ids) &&
    Array.isArray(snapshot.card_ids) &&
    Array.isArray(snapshot.results) &&
    typeof snapshot.completed === 'boolean'
  )
}

/**
 * One-shot read, for call sites that don't need a live reactive ref. A snapshot
 * left by an older build (different shape) is cleared and treated as absent, so
 * a resume never rebuilds from a stale schema.
 */
export function readPersistedSession(): PersistedSession | undefined {
  const value = usePersistedSession().value
  if (value && isValidSnapshot(value)) return value

  if (value) clearPersistedSession()
  return undefined
}

export function clearPersistedSession() {
  sessionStorage.removeItem(STORAGE_KEY)
}

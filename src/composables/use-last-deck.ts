import { ref } from 'vue'
import storage from '@/utils/storage'

const STORAGE_KEY = 'last-deck-id'

function read(): number | null {
  const saved = storage.get<string>(STORAGE_KEY)
  const parsed = saved != null ? Number(saved) : NaN
  return Number.isInteger(parsed) ? parsed : null
}

// Shared singleton: the term popover's default deck must update the instant the
// add-card modal saves, even though they're separate component trees.
const last_deck_id = ref<number | null>(read())

/**
 * The deck a card was most recently added to, persisted across sessions.
 * `last_deck_id` is `null` until the first card is saved.
 *
 * @example
 * const { last_deck_id, setLastDeck } = useLastDeck()
 * setLastDeck(deck.id) // remembered as the new default
 */
export function useLastDeck() {
  /** Remember `id` as the most recently used deck and persist it. */
  function setLastDeck(id: number) {
    last_deck_id.value = id
    storage.set(STORAGE_KEY, String(id))
  }

  return { last_deck_id, setLastDeck }
}

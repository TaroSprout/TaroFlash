import { fetchStudySessionCards } from './study-session-cards'

/**
 * Builds a merged study queue across several decks by fetching each deck's
 * server-built queue and concatenating them in the given order. Reuses the
 * per-deck RPC so each deck keeps its own daily caps + new/review partition;
 * the concat order is preserved (deck-by-deck) for unshuffled sessions.
 */
export async function fetchMultiDeckStudyCards(
  deck_ids: number[],
  study_all: boolean = false
): Promise<Card[]> {
  const batches = await Promise.all(deck_ids.map((id) => fetchStudySessionCards(id, study_all)))
  return batches.flat()
}

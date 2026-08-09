import { type CardBase } from '@type/card'

// An allow-list, not a convenience — a card carries fields that aren't columns
// at all, and a study session hangs more on it that must never be saved.
const CARD_UPSERT_COLUMNS = [
  'id',
  'deck_id',
  'front_text',
  'back_text',
  'created_at',
  'updated_at',
  'rank',
  'member_id'
] as const satisfies readonly (keyof CardBase)[]

export function buildCardPayload(card: Partial<Card>): Partial<CardBase> {
  const payload: Partial<CardBase> = {}
  for (const col of CARD_UPSERT_COLUMNS) {
    const value = card[col]
    if (value !== undefined) (payload as Record<string, unknown>)[col] = value
  }
  return payload
}

export function hasCardChanges(card: Card, values: Partial<Card>): boolean {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue
    if ((card as Record<string, unknown>)[key] !== value) return true
  }
  return false
}

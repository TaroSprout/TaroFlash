/** Total cards due across a set of decks, for a "study everything due" action. */
export function totalDueCardCount(decks: Deck[]): number {
  return decks.reduce((total, deck) => total + (deck.due_count ?? 0), 0)
}

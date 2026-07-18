// The slim, fully-resolved deck record returned by the get_session_decks_and_cards
// RPC — everything the deck-blind study session needs to schedule + render a
// card once it knows the card's deck_id. Resolved pacing values already walked
// the override -> preset -> system ladder on the server. `max_interval` stays
// nullable (null = uncapped -> the FSRS default max interval).
type SessionDeck = {
  id: number
  title?: string
  starting_side: CardStartingSide
  shuffle: boolean
  cover_config?: DeckCover
  card_attributes?: DeckCardAttributes
  desired_retention: number
  learning_steps: string[]
  relearning_steps: string[]
  leech_threshold: number
  max_interval: number | null
}

type SessionBootstrap = {
  decks: SessionDeck[]
  cards: Card[]
}

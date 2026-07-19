type CardImageLayout = 'above' | 'below' | 'behind'

type CardAttributes = {
  horizontal_alignment?: 'left' | 'center' | 'right'
  vertical_alignment?: 'top' | 'center' | 'bottom'
  text_size?: number
  image_layout?: CardImageLayout
}

type DeckCardAttributes = {
  front: CardAttributes
  back: CardAttributes
}

type Deck = {
  id: number
  created_at?: string
  updated_at?: string
  description?: string
  is_public?: boolean
  title?: string
  member_id?: number
  member_display_name?: string
  tags?: string[]
  due_count?: number
  reviewed_today_count?: number
  new_reviewed_today_count?: number
  study_config?: DeckConfig
  cover_config?: DeckCover
  card_attributes?: DeckCardAttributes
  has_image?: boolean
  card_count?: number
  rank?: number
  review_pacing_preset_id?: number | null
  // Resolved pacing values (override -> preset -> system). Daily limits and
  // max_interval use null = unbounded/uncapped.
  desired_retention?: number
  learning_steps?: string[]
  relearning_steps?: string[]
  max_reviews_per_day?: number | null
  max_new_per_day?: number | null
  leech_threshold?: number
  max_interval?: number | null
  // Raw per-field pins. A key's presence means the deck overrides that field
  // (value may be null = pinned-uncapped for the caps); an absent key follows
  // the linked preset. The resolved fields above are computed from these.
  pacing_overrides?: PacingOverrides
}

// Keyed by resolved field name; present key = pinned. Caps allow null (pinned
// to uncapped), mirroring the deck_review_pacing.overrides jsonb bag.
type PacingOverrides = Partial<{
  desired_retention: number
  learning_steps: string[]
  relearning_steps: string[]
  max_reviews_per_day: number | null
  max_new_per_day: number | null
  leech_threshold: number
  max_interval: number | null
}>

type CardEditorMode = 'view' | 'edit' | 'import-export'

/**
 * Which face a card opens on. `random` is rolled per card at study time, not
 * stored — see the session engine's per-card memo.
 */
type CardStartingSide = 'front' | 'back' | 'random'

type DeckConfig = {
  shuffle?: boolean
  starting_side?: CardStartingSide
  is_spaced?: boolean
  auto_play?: boolean
}

type DeckCoverPattern =
  | 'diagonal-stripes'
  | 'saw'
  | 'wave'
  | 'bank-note'
  | 'aztec'
  | 'endless-clouds'
  | 'leaf'
  | 'squiggle'

type DeckCover = {
  palette?: IdentityName
  pattern?: DeckCoverPattern
  icon?: string
}

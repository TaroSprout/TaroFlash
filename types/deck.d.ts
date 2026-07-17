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
  desired_retention?: number
  learning_steps?: string[]
  relearning_steps?: string[]
  // Raw per-field pins — non-null means this field is overriding its preset
  // rather than inheriting it. desired_retention/learning_steps/
  // relearning_steps above are already resolved against these.
  desired_retention_override?: number | null
  learning_steps_override?: string[] | null
  relearning_steps_override?: string[] | null
  // Resolved daily limits (override -> preset -> system, null = unbounded)
  max_reviews_per_day?: number | null
  max_new_per_day?: number | null
  // has_max_*_override gates its sibling *_override column: a NULL override
  // is ambiguous between "not overridden" and "overridden to unbounded", so
  // the boolean carries which case it is.
  has_max_reviews_override?: boolean
  max_reviews_per_day_override?: number | null
  has_max_new_override?: boolean
  max_new_per_day_override?: number | null
  // Resolved leech threshold (override -> preset -> system) + its raw pin.
  leech_threshold?: number
  leech_threshold_override?: number | null
  // Resolved max interval in days (null = uncapped); has_max_interval_override
  // gates the nullable override the same way the daily limits do.
  max_interval?: number | null
  has_max_interval_override?: boolean
  max_interval_override?: number | null
}

type CardEditorMode = 'view' | 'edit' | 'import-export'

type DeckConfig = {
  study_all_cards: boolean
  shuffle?: boolean
  flip_cards?: boolean
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
  theme?: Theme
  theme_dark?: Theme
  pattern?: DeckCoverPattern
  icon?: string
}

type DeckTheme = {
  light: Theme
  dark?: Theme
}

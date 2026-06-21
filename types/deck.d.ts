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
}

type CardEditorMode = 'view' | 'edit' | 'import-export'

type DeckStudyMode = 'flashcard'

type DeckConfig = {
  study_mode?: DeckStudyMode
  study_all_cards: boolean
  shuffle?: boolean
  max_reviews_per_day?: number | null
  max_new_per_day?: number | null
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

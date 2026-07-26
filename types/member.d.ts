type Member = {
  id?: string
  display_name?: string
  description?: string
  created_at?: string
  email?: string
  avatar_url?: string
  role?: MemberRole
  plan?: MemberPlan
  preferences?: MemberPreferences
  cover_config?: MemberCover
  // Embedded via the `members.plan` FK — null if the plan row is inactive/missing.
  plans?: Pick<PlanLimits, 'deck_limit' | 'cards_per_deck_limit'> | null
}

type MemberCover = DeckCover & { avatar?: string }

type PlanLimits = {
  id: MemberPlan
  deck_limit: number | null
  cards_per_deck_limit: number | null
}

type MemberPreferences = {
  accessibility?: {
    left_hand?: boolean
  }
  audio?: {
    muted?: boolean
    interface_sounds?: number
    hover_sounds?: number
  }
  study?: {
    show_all_ratings?: boolean
    show_rating_buttons?: boolean
    show_button_preview?: boolean
    show_card_preview?: boolean
    multi_deck_ordering?: MultiDeckOrdering
  }
}

// How a multi-deck session merges each deck's (already per-deck-ordered) cards
// into one queue. Orthogonal to the per-deck `shuffle` flag, which sets each
// deck's own internal order.
declare type MultiDeckOrdering = 'sequential' | 'even_spread' | 'random'

declare type MemberRole = 'user' | 'moderator' | 'admin'
declare type MemberPlan = 'free' | 'paid'

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
  }
}

declare type MemberRole = 'user' | 'moderator' | 'admin'
declare type MemberPlan = 'free' | 'paid'

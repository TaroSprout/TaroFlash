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
    study_sounds?: number
    interface_sounds?: number
    hover_sounds?: number
  }
  study?: {
    show_all_ratings?: boolean
    desired_retention?: number
    learning_steps?: string[]
    relearning_steps?: string[]
  }
}

declare type MemberRole = 'user' | 'moderator' | 'admin'
declare type MemberPlan = 'free' | 'paid'

type Theme =
  | 'blue-900'
  | 'blue-800'
  | 'blue-650'
  | 'blue-500'
  | 'blue-400'
  | 'stone-900'
  | 'stone-700'
  | 'green-800'
  | 'green-600'
  | 'green-500'
  | 'green-400'
  | 'green-300'
  | 'green-200'
  | 'purple-700'
  | 'purple-500'
  | 'purple-400'
  | 'purple-200'
  | 'pink-700'
  | 'pink-500'
  | 'pink-400'
  | 'red-600'
  | 'red-500'
  | 'red-400'
  | 'red-300'
  | 'orange-700'
  | 'yellow-700'
  | 'orange-500'
  | 'yellow-500'
  | 'yellow-400'
  | 'brown-800'
  | 'brown-700'
  | 'brown-500'
  | 'brown-300'
  | 'brown-200'
  | 'brown-100'
  | 'brown-50'
  | 'grey-900'
  | 'grey-800'
  | 'grey-700'
  | 'grey-500'
  | 'grey-400'
  | 'grey-300'
  | 'white'
  | 'black'

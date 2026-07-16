type ReviewPacingPreset = {
  id: number
  member_id?: string | null
  name: string
  desired_retention: number
  learning_steps: string[]
  relearning_steps: string[]
  max_reviews_per_day: number | null
  max_new_per_day: number | null
  is_system: boolean
  created_at?: string
}

/** The three FSRS scheduling params a study session needs, already resolved. */
type ReviewPacingParams = {
  desired_retention: number
  learning_steps: string[]
  relearning_steps: string[]
}

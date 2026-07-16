type ReviewPacingPreset = {
  id: number
  member_id?: string | null
  name: string
  desired_retention: number
  learning_steps: string[]
  relearning_steps: string[]
  is_system: boolean
  created_at?: string
}

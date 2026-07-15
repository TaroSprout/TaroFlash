type FeedbackType = 'idea' | 'bug' | 'other'
type FeedbackStatus = 'new' | 'accepted' | 'rejected' | 'in-progress' | 'done'
type FeedbackVisibility = 'public' | 'internal'

type FeedbackItem = {
  id: number
  created_at: string
  member_id: string
  title: string
  body?: string
  type: FeedbackType
  status: FeedbackStatus
  visibility: FeedbackVisibility
  vote_count: number
  voted_by_me: boolean
}

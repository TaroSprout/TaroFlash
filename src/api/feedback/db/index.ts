import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

export async function fetchFeedbackItems(): Promise<FeedbackItem[]> {
  const { data, error } = await supabase.rpc('feedback_items_with_votes').select('*')

  if (error) {
    logger.error(error.message)
    throw error
  }

  return data ?? []
}

export type SubmitFeedbackParams = {
  title: string
  body?: string
  type: FeedbackType
}

export async function submitFeedback(params: SubmitFeedbackParams): Promise<FeedbackItem> {
  const { data, error } = await supabase.rpc('submit_feedback', {
    p_title: params.title,
    p_body: params.body,
    p_type: params.type
  })

  if (error) {
    logger.error(error.message)
    throw error
  }

  return data as FeedbackItem
}

export async function toggleFeedbackVote(feedback_id: number): Promise<boolean> {
  const { data, error } = await supabase.rpc('toggle_feedback_vote', {
    p_feedback_id: feedback_id
  })

  if (error) {
    logger.error(error.message)
    throw error
  }

  return data
}

export type UpdateFeedbackItemParams = {
  feedback_id: number
  status: FeedbackStatus
  visibility: FeedbackVisibility
}

export async function updateFeedbackItem(params: UpdateFeedbackItemParams): Promise<FeedbackItem> {
  const { data, error } = await supabase.rpc('update_feedback_item', {
    p_feedback_id: params.feedback_id,
    p_status: params.status,
    p_visibility: params.visibility
  })

  if (error) {
    logger.error(error.message)
    throw error
  }

  return data as FeedbackItem
}

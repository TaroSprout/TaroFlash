import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

/** Every dial a preset sets, without the preset itself — what a deck ends up with. */
export type ReviewPacingValues = Pick<
  ReviewPacingPreset,
  | 'desired_retention'
  | 'learning_steps'
  | 'relearning_steps'
  | 'max_reviews_per_day'
  | 'max_new_per_day'
  | 'leech_threshold'
  | 'max_interval'
>

export type NewReviewPacingPreset = ReviewPacingValues & Pick<ReviewPacingPreset, 'name'>

/** The member's own presets, plus the built-in one everybody gets. */
export async function fetchPresets(): Promise<ReviewPacingPreset[]> {
  const { data, error } = await supabase
    .from('review_pacing_presets')
    .select('*')
    .order('is_system', { ascending: false })
    .order('created_at')

  if (error) {
    logger.error(error.message)
    throw error
  }

  return data as ReviewPacingPreset[]
}

export async function createPreset(preset: NewReviewPacingPreset): Promise<ReviewPacingPreset> {
  const { data, error } = await supabase
    .from('review_pacing_presets')
    .insert(preset)
    .select()
    .single()

  if (error) {
    logger.error(error.message)
    throw error
  }

  return data as ReviewPacingPreset
}

export async function updatePreset({
  id,
  ...updates
}: Pick<ReviewPacingPreset, 'id'> & Partial<NewReviewPacingPreset>): Promise<ReviewPacingPreset> {
  const { data, error } = await supabase
    .from('review_pacing_presets')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logger.error(error.message)
    throw error
  }

  return data as ReviewPacingPreset
}

/** Which preset a deck follows, and which dials it pins for itself. */
export type DeckPacing = {
  deck_id: number
  review_pacing_preset_id: number | null
  overrides: PacingOverrides
}

/**
 * Saves a deck's pacing and nothing else, so a preset action can't flush the
 * rest of an open, unsaved deck edit along with it.
 */
export async function saveDeckPacing(pacing: DeckPacing): Promise<void> {
  const { error } = await supabase
    .from('deck_review_pacing')
    .upsert(pacing, { onConflict: 'deck_id' })

  if (error) {
    logger.error(error.message)
    throw error
  }
}

export async function deletePreset(id: number): Promise<void> {
  const { error } = await supabase.from('review_pacing_presets').delete().eq('id', id)

  if (error) {
    logger.error(error.message)
    throw error
  }
}

import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

/** Every pacing field a preset carries, minus its identity — the shape a deck resolves down to. */
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

/** Fetches the current member's preset library plus the one system preset — RLS scopes the rest. */
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

/** A deck's pacing sidecar row — which preset it follows, and what it pins locally. */
export type DeckPacing = {
  deck_id: number
  review_pacing_preset_id: number | null
  overrides: PacingOverrides
}

/**
 * Writes just a deck's pacing sidecar. Narrower than `save_deck`, which rewrites
 * every editable deck column; this lets a preset action persist the deck half of
 * its own work without flushing the rest of an open draft.
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

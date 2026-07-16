import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'
import { isoNow } from '@/utils/date'

export type NewReviewPacingPreset = Pick<
  ReviewPacingPreset,
  'name' | 'desired_retention' | 'learning_steps' | 'relearning_steps'
>

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

export async function deletePreset(id: number): Promise<void> {
  const { error } = await supabase.from('review_pacing_presets').delete().eq('id', id)

  if (error) {
    logger.error(error.message)
    throw error
  }
}

/** Sets which preset a deck follows. Leaves any existing per-field overrides on the deck untouched. */
export async function assignDeckPreset(deck_id: number, preset_id: number): Promise<void> {
  const { error } = await supabase
    .from('deck_review_pacing')
    .upsert({ deck_id, preset_id, updated_at: isoNow() }, { onConflict: 'deck_id' })

  if (error) {
    logger.error(error.message)
    throw error
  }
}

/** Pins one or more fields away from the deck's linked preset. Leaves `preset_id` untouched. */
export async function setDeckPacingOverrides(
  deck_id: number,
  overrides: DeckReviewPacingOverrides
): Promise<void> {
  const { error } = await supabase
    .from('deck_review_pacing')
    .upsert({ deck_id, ...overrides, updated_at: isoNow() }, { onConflict: 'deck_id' })

  if (error) {
    logger.error(error.message)
    throw error
  }
}

/** Reverts a deck to the system default preset with no overrides. */
export async function unassignDeckPreset(deck_id: number): Promise<void> {
  const { error } = await supabase.from('deck_review_pacing').delete().eq('deck_id', deck_id)

  if (error) {
    logger.error(error.message)
    throw error
  }
}

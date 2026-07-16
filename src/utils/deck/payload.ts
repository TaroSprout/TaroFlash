import { DECK_SETTINGS_DEFAULTS, DECK_CONFIG_DEFAULTS } from './defaults'

function stripNullish<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
  ) as Partial<T>
}

export type DeckPacingEditorState = {
  preset_id: number | null
  desired_retention_override: number | null
  learning_steps_override: string[] | null
  relearning_steps_override: string[] | null
  has_max_reviews_override: boolean
  max_reviews_per_day_override: number | null
  has_max_new_override: boolean
  max_new_per_day_override: number | null
}

export type DeckEditorState = {
  settings: { title?: string; description?: string; is_public?: boolean }
  config: DeckConfig
  cover: DeckCover
  card_attributes: DeckCardAttributes
  pacing: DeckPacingEditorState
}

export type DeckPayload = {
  title?: string
  description?: string
  is_public: boolean
  study_config: DeckConfig
  cover_config: DeckCover
  card_attributes: DeckCardAttributes
  review_pacing_preset_id: number | null
  desired_retention_override: number | null
  learning_steps_override: string[] | null
  relearning_steps_override: string[] | null
  has_max_reviews_override: boolean
  max_reviews_per_day_override: number | null
  has_max_new_override: boolean
  max_new_per_day_override: number | null
}

/**
 * Build the persisted shape of a deck from live editor state. Single source
 * of truth for "what counts as deck content" — consumed by save (network
 * payload) and the dirty-state check (snapshot + compare). Adding a new
 * editable field means touching only this function.
 *
 * Key order is fixed so two payloads with identical content serialize
 * identically. Server-managed fields (`id`, `updated_at`) are excluded — the
 * caller layers them back on when needed.
 */
export function buildDeckPayload(state: DeckEditorState): DeckPayload {
  return {
    title: state.settings.title,
    description: state.settings.description,
    is_public: state.settings.is_public ?? DECK_SETTINGS_DEFAULTS.is_public,
    study_config: { ...DECK_CONFIG_DEFAULTS, ...state.config },
    cover_config: { ...state.cover },
    card_attributes: {
      front: stripNullish(state.card_attributes.front),
      back: stripNullish(state.card_attributes.back)
    },
    review_pacing_preset_id: state.pacing.preset_id,
    desired_retention_override: state.pacing.desired_retention_override,
    learning_steps_override: state.pacing.learning_steps_override,
    relearning_steps_override: state.pacing.relearning_steps_override,
    has_max_reviews_override: state.pacing.has_max_reviews_override,
    max_reviews_per_day_override: state.pacing.max_reviews_per_day_override,
    has_max_new_override: state.pacing.has_max_new_override,
    max_new_per_day_override: state.pacing.max_new_per_day_override
  }
}

/** True when the current payload differs from a previously captured snapshot. */
export function hasDeckChanges(state: DeckEditorState, snapshot: DeckPayload): boolean {
  return JSON.stringify(buildDeckPayload(state)) !== JSON.stringify(snapshot)
}

import { DECK_SETTINGS_DEFAULTS, DECK_CONFIG_DEFAULTS } from './defaults'

function stripNullish<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
  ) as Partial<T>
}

export type DeckEditorState = {
  settings: { title?: string; description?: string; is_public?: boolean }
  config: DeckConfig
  cover: DeckCover
  card_attributes: DeckCardAttributes
}

export type DeckPayload = {
  title?: string
  description?: string
  is_public: boolean
  study_config: DeckConfig
  cover_config: DeckCover
  card_attributes: DeckCardAttributes
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
    }
  }
}

/** True when the current payload differs from a previously captured snapshot. */
export function hasDeckChanges(state: DeckEditorState, snapshot: DeckPayload): boolean {
  return JSON.stringify(buildDeckPayload(state)) !== JSON.stringify(snapshot)
}

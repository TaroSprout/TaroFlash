import { MEMBER_SETTINGS_DEFAULTS, withMemberCardCoverDefaults } from './defaults'
import { withMemberPreferencesDefaults, type ResolvedMemberPreferences } from './preferences'

export type MemberEditorState = {
  settings: { display_name?: string; description?: string }
  preferences: MemberPreferences
  cover: DeckCover
}

export type MemberPayload = {
  display_name: string
  description: string
  preferences: ResolvedMemberPreferences
  cover_config: DeckCover
}

/**
 * Build the persisted shape of a member profile from live editor state.
 * Single source of truth for "what counts as editable profile content" —
 * consumed by save (network payload) and the dirty-state check.
 */
export function buildMemberPayload(state: MemberEditorState): MemberPayload {
  return {
    display_name: state.settings.display_name ?? MEMBER_SETTINGS_DEFAULTS.display_name,
    description: state.settings.description ?? MEMBER_SETTINGS_DEFAULTS.description,
    preferences: withMemberPreferencesDefaults(state.preferences),
    cover_config: withMemberCardCoverDefaults(state.cover)
  }
}

/** True when the current payload differs from a previously captured snapshot. */
export function hasMemberChanges(state: MemberEditorState, snapshot: MemberPayload): boolean {
  return JSON.stringify(buildMemberPayload(state)) !== JSON.stringify(snapshot)
}

export type { ResolvedMemberPreferences }

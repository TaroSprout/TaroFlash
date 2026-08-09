/**
 * What a member's card looks like before they've chosen anything. Read here
 * from both the settings form and its preview, so the two always agree.
 */

export const MEMBER_SETTINGS_DEFAULTS = {
  display_name: '',
  description: ''
} as const

export const MEMBER_DISPLAY_NAME_MAX_LENGTH = 12

export const MEMBER_CARD_COVER_DEFAULTS: MemberCover = {
  palette: 'green',
  pattern: 'bank-note'
}

/** Merge a partial cover over MEMBER_CARD_COVER_DEFAULTS, dropping undefined overrides. */
export function withMemberCardCoverDefaults(partial?: Partial<MemberCover>): MemberCover {
  const out = { ...MEMBER_CARD_COVER_DEFAULTS }
  if (!partial) return out
  for (const k of Object.keys(partial) as (keyof MemberCover)[]) {
    const v = partial[k]
    if (v !== undefined) (out as Record<string, unknown>)[k] = v
  }
  return out
}

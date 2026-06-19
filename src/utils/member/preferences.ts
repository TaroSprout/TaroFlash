import { AUDIO_VOLUME_DEFAULTS } from '@/sfx/config'

export type ResolvedMemberPreferences = {
  accessibility: {
    left_hand: boolean
  }
  audio: {
    study_sounds: number
    interface_sounds: number
    hover_sounds: number
  }
}

export const MEMBER_PREFERENCES_DEFAULTS: ResolvedMemberPreferences = {
  accessibility: {
    left_hand: false
  },
  audio: { ...AUDIO_VOLUME_DEFAULTS }
}

/** Merge a partial preferences blob over defaults, filling any missing namespace/key. */
export function withMemberPreferencesDefaults(
  partial?: MemberPreferences | null
): ResolvedMemberPreferences {
  return {
    accessibility: {
      left_hand:
        partial?.accessibility?.left_hand ?? MEMBER_PREFERENCES_DEFAULTS.accessibility.left_hand
    },
    audio: {
      study_sounds: partial?.audio?.study_sounds ?? MEMBER_PREFERENCES_DEFAULTS.audio.study_sounds,
      interface_sounds:
        partial?.audio?.interface_sounds ?? MEMBER_PREFERENCES_DEFAULTS.audio.interface_sounds,
      hover_sounds: partial?.audio?.hover_sounds ?? MEMBER_PREFERENCES_DEFAULTS.audio.hover_sounds
    }
  }
}

import { BUS_DEFAULTS, type Bus } from '@/sfx/config'

export type ResolvedMemberPreferences = {
  accessibility: {
    left_hand: boolean
  }
  // Persisted audio prefs — one slider per bus, named with the `_sounds` suffix
  // the settings UI and DB use. `toBusVolumes` maps them onto the player's buses.
  audio: {
    study_sounds: number
    interface_sounds: number
    hover_sounds: number
  }
  study: {
    show_all_ratings: boolean
  }
}

export const MEMBER_PREFERENCES_DEFAULTS: ResolvedMemberPreferences = {
  accessibility: {
    left_hand: false
  },
  audio: {
    study_sounds: BUS_DEFAULTS.study,
    interface_sounds: BUS_DEFAULTS.interface,
    hover_sounds: BUS_DEFAULTS.hover
  },
  study: {
    show_all_ratings: true
  }
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
    },
    study: {
      show_all_ratings:
        partial?.study?.show_all_ratings ?? MEMBER_PREFERENCES_DEFAULTS.study.show_all_ratings
    }
  }
}

/** Map persisted `*_sounds` prefs onto the bus-keyed volumes the player consumes. */
export function toBusVolumes(audio: ResolvedMemberPreferences['audio']): Record<Bus, number> {
  return {
    study: audio.study_sounds,
    interface: audio.interface_sounds,
    hover: audio.hover_sounds
  }
}

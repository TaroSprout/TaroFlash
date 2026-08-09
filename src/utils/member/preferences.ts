import { BUS_DEFAULTS, type Bus } from '@/sfx/config'

export type ResolvedMemberPreferences = {
  accessibility: {
    left_hand: boolean
  }
  // One slider each, stored under the names the settings screen and the
  // database use. `toBusVolumes` translates them for the player.
  audio: {
    muted: boolean
    interface_sounds: number
    hover_sounds: number
  }
  study: {
    show_all_ratings: boolean
    show_rating_buttons: boolean
    show_button_preview: boolean
    show_card_preview: boolean
    multi_deck_ordering: MultiDeckOrdering
  }
}

export const MEMBER_PREFERENCES_DEFAULTS: ResolvedMemberPreferences = {
  accessibility: {
    left_hand: false
  },
  audio: {
    muted: false,
    interface_sounds: BUS_DEFAULTS.interface,
    hover_sounds: BUS_DEFAULTS.hover
  },
  study: {
    show_all_ratings: false,
    show_rating_buttons: true,
    show_button_preview: false,
    show_card_preview: true,
    multi_deck_ordering: 'random'
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
      muted: partial?.audio?.muted ?? MEMBER_PREFERENCES_DEFAULTS.audio.muted,
      interface_sounds:
        partial?.audio?.interface_sounds ?? MEMBER_PREFERENCES_DEFAULTS.audio.interface_sounds,
      hover_sounds: partial?.audio?.hover_sounds ?? MEMBER_PREFERENCES_DEFAULTS.audio.hover_sounds
    },
    study: {
      show_all_ratings:
        partial?.study?.show_all_ratings ?? MEMBER_PREFERENCES_DEFAULTS.study.show_all_ratings,
      show_rating_buttons:
        partial?.study?.show_rating_buttons ??
        MEMBER_PREFERENCES_DEFAULTS.study.show_rating_buttons,
      show_button_preview:
        partial?.study?.show_button_preview ??
        MEMBER_PREFERENCES_DEFAULTS.study.show_button_preview,
      show_card_preview:
        partial?.study?.show_card_preview ?? MEMBER_PREFERENCES_DEFAULTS.study.show_card_preview,
      multi_deck_ordering:
        partial?.study?.multi_deck_ordering ?? MEMBER_PREFERENCES_DEFAULTS.study.multi_deck_ordering
    }
  }
}

/**
 * Turns the member's saved sound settings into the volumes the player wants.
 * Muted wins over every slider, so their individual levels survive being
 * muted and come back as they were.
 */
export function toBusVolumes(audio: ResolvedMemberPreferences['audio']): Record<Bus, number> {
  if (audio.muted) return { interface: 0, hover: 0 }

  return {
    interface: audio.interface_sounds,
    hover: audio.hover_sounds
  }
}

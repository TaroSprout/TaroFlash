import type { Bus, SoundKey } from './config'

// The only place an audio filename appears. Everything else in the app names a
// role, so changing which file a cue uses is an edit here and nowhere else.

type RoleDef = {
  sound: SoundKey | SoundKey[]
  // Overrides the file's own bus, which otherwise falls back to 'interface'.
  bus?: Bus
  debounce?: number
}

// Suppresses the repeat when someone leans on a control that won't move.
const REJECTED_DEBOUNCE_MS = 40

const TYPING_CHATTER: SoundKey[] = ['type_01', 'type_02', 'type_03', 'type_04', 'type_05', 'tap_05']

export const ROLES = {
  'ui.press': { sound: 'snappy_button_5' },
  'ui.hover': { sound: TYPING_CHATTER, bus: 'hover' },
  'ui.focus': { sound: 'type_05' },
  'ui.select': { sound: 'select' },
  'ui.deselect': { sound: 'digi_powerdown' },
  'ui.rejected': { sound: 'digi_powerdown', debounce: REJECTED_DEBOUNCE_MS },
  'ui.toggle-on': { sound: 'toggle_on' },
  'ui.toggle-off': { sound: 'toggle_off' },

  'dialog.open': { sound: 'snappy_button_3' },
  // The softer of the two opening cues; both close on 'dialog.close'.
  'dialog.open-chime': { sound: 'wooden_chime_ring' },
  'dialog.close': { sound: 'pop_up_close' },
  'dialog.dismiss': { sound: 'digi_powerdown' },

  'phone.open': { sound: 'pop_window' },
  'phone.close': { sound: 'pop_window' },
  'phone.app-focus': { sound: 'pop_drip_mid', bus: 'hover' },

  'notice.success': { sound: 'success_1' },
  'notice.error': { sound: 'etc_woodblock_stuck' },
  'notice.info': { sound: 'generic_notification_9' },

  'card.flip-away': { sound: 'transition_up' },
  'card.flip-back': { sound: 'transition_down' },
  'card.grade-good': { sound: 'music_plink_ok' },
  'card.grade-again': { sound: 'music_plink_locancel' },
  'card.delete': { sound: 'trash_crumple_short' },
  'card.image-captured': { sound: 'etc_camera_shutter' },
  'card.saved': { sound: 'success_3' },

  'file.accepted': { sound: 'music_plink_ok' },

  'gesture.tick': { sound: 'tap_05' },
  'gesture.zone-cross': { sound: 'music_plink_mid' },

  'nav.page-forward': { sound: 'slide_up' },
  'nav.page-back': { sound: 'slide_left' },

  'session.intro': { sound: 'music_plink_chordyes' },
  'session.complete': { sound: 'music_pizz_duo_hi' }
} satisfies Record<string, RoleDef>

export type SfxRole = keyof typeof ROLES

/**
 * What a component asks for when it wants a channel to make a noise.
 *
 * One shape across ui-kit and layout-kit. `false` silences that channel; a
 * channel left out falls back to whatever the primitive plays by default.
 */
export type SfxOptions = {
  // Routed through staged-tap — the directive never sees these.
  press?: SfxRole | false
  tap_pre?: SfxRole | false
  rejected?: SfxRole | false
  // Handled by the directive.
  hover?: SfxRole | false
  focus?: SfxRole | false
  // Shells: a dialog's own lifecycle, and a paged-window's page changes.
  open?: SfxRole | false
  close?: SfxRole | false
  confirm?: SfxRole | false
  cancel?: SfxRole | false
  select?: SfxRole | false
  reselect?: SfxRole | false
}

export function roleDef(role: SfxRole): RoleDef {
  return ROLES[role]
}

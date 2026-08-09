export type Bus = 'interface' | 'hover'

export type SoundDef = {
  ext?: string
  default_volume?: number
  // Set this only for a sound that is one bus whatever triggers it — the
  // typing chatter is always 'hover'. Anything else takes 'interface'.
  defaultBus?: Bus
}

// One entry per audio file — keep the list flat. A sound's identity is its
// file, and its bus is resolved when it's emitted, not by where it sits here.
export const SOUNDS = {
  bell_ping_high_pitched: {},
  card_drop: { default_volume: 0.3 },
  chime_short_chord_up: {},
  click_04: { default_volume: 0.1 },
  click_07: { default_volume: 0.1 },
  chime_ring: {},
  digi_powerdown: {},
  double_pop_down: {},
  double_pop_up: {},
  etc_camera_reel: {},
  etc_camera_shutter: {},
  etc_error_break: {},
  etc_error_swipe: {},
  etc_woodblock_stuck: {},
  pop_drip_mid: { default_volume: 0.1 },
  pop_window: {},
  slide_up: {},
  trash_crumple_short: {},
  negative_pop: { ext: 'mp3', default_volume: 0.5 },
  select: { default_volume: 0.3 },
  toggle_off: { default_volume: 0.3 },
  toggle_on: { default_volume: 0.3 },
  transition_down: {},
  transition_up: {},
  music_plink_locancel: {},
  music_plink_ok: {},
  music_plink_mid: {},
  music_plink_chordyes: {},
  music_pizz_duo_hi: {},
  music_pizz_prompt: {},
  tap_03: {},
  tap_02: { default_volume: 0.1 },
  tap_04: {},
  tap_05: { default_volume: 0.1 },
  pop_up_close: {},
  snappy_button_2: {},
  snappy_button_3: {},
  snappy_button_5: {},
  pop_up_pop: {},
  type_01: { default_volume: 0.1, defaultBus: 'hover' },
  type_02: { default_volume: 0.1, defaultBus: 'hover' },
  type_03: { default_volume: 0.1, defaultBus: 'hover' },
  type_04: { default_volume: 0.1, defaultBus: 'hover' },
  type_05: { default_volume: 0.1, defaultBus: 'hover' },
  clicky_button_4: {},
  slide_left: {},
  wooden_chime_ring: {},
  generic_notification_9: {},
  generic_button_15: {},
  success_1: {},
  success_3: {},
  handle_drag_tick: {}
} satisfies Record<string, SoundDef>

export type SoundKey = keyof typeof SOUNDS

export const TYPE_SFX: SoundKey[] = [
  'type_01',
  'type_02',
  'type_03',
  'type_04',
  'type_05',
  'tap_05'
]

// Resting volume setting per bus. 5 yields a 1.0× multiplier (see player.ts).
export const BUS_DEFAULTS: Record<Bus, number> = {
  interface: 5,
  hover: 5
}

export type Bus = 'interface' | 'study' | 'hover'

export type SoundDef = {
  ext?: string
  default_volume?: number
  // The volume bus a sound answers to when the caller doesn't override it.
  // Only set for sounds that are intrinsically one bus regardless of trigger
  // (the type_0x chatter is always 'hover'). Everything else defaults to
  // 'interface'; study contexts pass `{ bus: 'study' }` at emit time.
  defaultBus?: Bus
}

// Flat registry — one entry per audio file, one decoded buffer. A sound's
// identity is its file; its volume bus is resolved at emit time (see player.ts),
// not baked into a namespace.
export const SOUNDS = {
  card_drop: { default_volume: 0.3 },
  chime_short_chord_up: {},
  click_04: { default_volume: 0.1 },
  click_07: { default_volume: 0.1 },
  digi_powerdown: {},
  double_pop_down: {},
  double_pop_up: {},
  etc_camera_reel: {},
  etc_camera_shutter: {},
  etc_error_break: {},
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
  success_1: {}
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
  study: 5,
  hover: 5
}

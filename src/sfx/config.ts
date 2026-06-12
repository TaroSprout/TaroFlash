import { createAudioConfig } from './player'

export const AUDIO_CONFIG = createAudioConfig({
  ui: {
    card_drop: {
      default_volume: 0.3
    },
    chime_short_chord_up: {},
    click_04: {
      default_volume: 0.1
    },
    click_07: {
      default_volume: 0.1
    },
    digi_powerdown: {},
    double_pop_down: {},
    double_pop_up: {},
    etc_camera_reel: {},
    etc_camera_shutter: {},
    etc_error_break: {},
    etc_woodblock_stuck: {},
    pop_drip_mid: {
      default_volume: 0.1
    },
    pop_window: {},
    slide_up: {},
    trash_crumple_short: {},
    negative_pop: {
      ext: 'mp3',
      default_volume: 0.5
    },
    select: {
      default_volume: 0.3
    },
    toggle_off: {
      default_volume: 0.3
    },
    toggle_on: {
      default_volume: 0.3
    },
    transition_down: {},
    transition_up: {},
    music_plink_locancel: {},
    music_plink_ok: {},
    music_plink_mid: {},
    music_plink_chordyes: {},
    music_pizz_duo_hi: {},
    music_pizz_prompt: {},
    tap_03: {},
    tap_04: {},
    tap_05: {},
    alert_clicks_wooden: {},
    pop_up_close: {},
    snappy_button_2: {},
    snappy_button_3: {},
    snappy_button_5: {},
    pop_up_pop: {}
  }
})

export type AudioProperties = {
  path?: string
  ext?: string
  default_volume?: number
  preload?: boolean
}

export type AudioConfig = typeof AUDIO_CONFIG
export type AudioCategoryKey = keyof AudioConfig
export type AudioCategory = AudioConfig[AudioCategoryKey]
export type AudioKey = keyof AudioCategory

export type NamespacedAudioKey = {
  [C in AudioCategoryKey]: `${C}.${keyof AudioConfig[C] & string}`
}[AudioCategoryKey]

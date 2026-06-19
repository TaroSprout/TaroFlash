import engine from '@/sfx/engine'
import { debounce } from '@/utils/debounce'
import {
  AUDIO_CONFIG,
  AUDIO_VOLUME_DEFAULTS,
  HOVER_SFX_SET,
  type AudioCategoryKey,
  type AudioCategory,
  type AudioKey,
  type NamespacedAudioKey,
  type AudioProperties
} from '@/sfx/config'

type AudioVolumeSettings = typeof AUDIO_VOLUME_DEFAULTS

// Maps each audio category to the user-facing volume setting that controls it.
// Add one entry here when a new AudioCategoryKey is introduced.
const CATEGORY_VOLUME_KEY: Record<AudioCategoryKey, keyof AudioVolumeSettings> = {
  study: 'study_sounds',
  ui: 'interface_sounds'
}

export type PlayOptions = {
  volume?: number
  debounce?: number
  blocking?: boolean
}

type LoadedSound = {
  buffer: AudioBuffer
  volume: number
}

// Audio files ship as separate hashed assets; setup() fetches and decodes them
// at runtime. The glob captures URL strings only — no binary payload lands in
// the JS bundle. setup() itself is invoked post-paint from App.vue so audio
// download never blocks first paint.
const AUDIO_FILES = import.meta.glob('@/assets/audio/**/*.{wav,mp3,ogg}', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>

const DEFAULT_VOLUME = 0.5
const DEFAULT_CATEGORY_VOLUME = 1
const DEBOUNCE_DELAY = 10
const QUEUE_TIMEOUT = 10

class AudioPlayer {
  loaded_sounds = new Map<string, LoadedSound>()
  initialized = false
  unlock_registered = false
  unlocked = false
  queued_sound: { key: NamespacedAudioKey; options: PlayOptions } | undefined
  blocking = false
  volume_settings: typeof AUDIO_VOLUME_DEFAULTS = { ...AUDIO_VOLUME_DEFAULTS }

  setVolumeConfig = (settings: typeof AUDIO_VOLUME_DEFAULTS) => {
    this.volume_settings = settings
  }

  setup = () => {
    if (this.initialized) return Promise.resolve()
    this.initialized = true

    this._registerUnlock()

    const categories = Object.entries(AUDIO_CONFIG)

    return Promise.all(
      categories.map(([name, category]) =>
        this._setupAudioCategory(name as AudioCategoryKey, category)
      )
    )
  }

  play = async (key: NamespacedAudioKey, options: PlayOptions = {}): Promise<void> => {
    if (options.blocking) this.blocking = true

    return debounce(() => this._play(key, options), {
      delay: options.debounce ?? DEBOUNCE_DELAY,
      key
    })
  }

  private _enqueue = (key: NamespacedAudioKey, options: PlayOptions = {}) => {
    this.queued_sound = { key, options }

    setTimeout(() => {
      if (this.queued_sound?.key === key) {
        this.queued_sound = undefined
      }
    }, QUEUE_TIMEOUT)
  }

  private _play = async (key: NamespacedAudioKey, options: PlayOptions = {}): Promise<void> => {
    if (this.blocking && !options.blocking) return

    if (!this.unlocked) {
      this._enqueue(key, options)
      return
    }

    const sound = this.loaded_sounds.get(key)

    if (!sound) {
      throw new Error(`Sound "${key}" not loaded.`)
    }

    const running = await engine.resume()

    if (!running) {
      if (options.blocking) this.blocking = false
      return
    }

    return new Promise((resolve) => {
      // The returned Promise must settle in one of two ways:
      //   1. 'ended'  — the BufferSource finished playing.
      //   2. Timer    — the safety net: if the context suspends mid-play (tab
      //                 hides, device locks) `onended` never fires and the
      //                 promise would hang forever, stalling awaiters of emitSfx.
      //
      // Whichever wins, settle() cancels the timer so the loser can't double-fire.
      let settled = false
      const settle = () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        if (options.blocking) this.blocking = false
        resolve()
      }

      const volume = options.volume ?? sound.volume * this._getVolumeMultiplier(key)
      const { ended } = engine.play(sound.buffer, volume)
      const fallbackMs = Math.ceil((sound.buffer.duration || 1) * 1000) + 500
      const timer = setTimeout(settle, fallbackMs)

      void ended.then(settle)
    })
  }

  private async _setupAudioCategory(
    category_name: AudioCategoryKey,
    category: AudioCategory
  ): Promise<void> {
    const entries = Object.entries(category)

    const loads = entries.map(([name, cfg]) => {
      const key: NamespacedAudioKey = `${category_name}.${name as AudioKey}`
      const categoryVolume = DEFAULT_CATEGORY_VOLUME
      const volume = (cfg.default_volume ?? DEFAULT_VOLUME) * categoryVolume

      return this._loadSound(key, cfg).then((buffer) => {
        this.loaded_sounds.set(key, { buffer, volume })
      })
    })

    await Promise.all(loads)
  }

  // 5 is the default setting, so dividing by 5 yields a 1.0× multiplier at rest —
  // sounds play at their designed default_volume unchanged.
  private _getVolumeMultiplier(key: NamespacedAudioKey): number {
    const setting_key = HOVER_SFX_SET.has(key)
      ? 'hover_sounds'
      : CATEGORY_VOLUME_KEY[key.split('.')[0] as AudioCategoryKey]
    return this.volume_settings[setting_key] / 5
  }

  private _loadSound(key: NamespacedAudioKey, cfg: AudioProperties): Promise<AudioBuffer> {
    const audio_name = key.split('.')[1]
    const ext = cfg.ext ?? 'wav'
    const path = `/src/assets/audio/${audio_name}.${ext}`

    const url = AUDIO_FILES[path]

    return engine.decode(url).catch((err) => {
      throw new Error(`Failed to load audio "${key}": ${String(err)}`)
    })
  }

  /**
   * Callback for when the audio system is unlocked.
   * Plays any queued sound.
   */
  private _onUnlock = () => {
    this.unlocked = true

    if (this.queued_sound) {
      const { key, options } = this.queued_sound
      this.play(key, options)
      this.queued_sound = undefined
    }
  }

  /**
   * Registers the unlock callback for the audio system.
   * Only registers once.
   */
  private _registerUnlock = () => {
    if (this.unlock_registered) return
    this.unlock_registered = true
    engine.onUnlock(this._onUnlock)
  }
}

// Export instance as a singleton
export default new AudioPlayer()

export function createAudioConfig<T extends CreateAudioConfigArguments>(config: T) {
  return config as {
    [C in keyof T]: {
      [K in keyof T[C]]: AudioProperties
    }
  }
}

type CreateAudioConfigArguments = { [category: string]: { [name: string]: AudioProperties } }

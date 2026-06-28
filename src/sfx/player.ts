import engine from '@/sfx/engine'
import { debounce } from '@/utils/debounce'
import { SOUNDS, type Bus, type SoundDef, type SoundKey } from '@/sfx/config'

export type PlayOptions = {
  volume?: number
  debounce?: number
  // Override the bus this sound is routed through. Falls back to the sound's
  // defaultBus, then 'interface'. Study contexts pass `{ bus: 'study' }`.
  bus?: Bus
}

type LoadedSound = {
  buffer: AudioBuffer
  base_volume: number
  default_bus: Bus
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
const DEFAULT_BUS: Bus = 'interface'
const DEBOUNCE_DELAY = 10
const QUEUE_TIMEOUT = 10

class AudioPlayer {
  loaded_sounds = new Map<SoundKey, LoadedSound>()
  initialized = false
  unlock_registered = false
  unlocked = false
  queued_sound: { key: SoundKey; options: PlayOptions } | undefined
  // Resting setting per bus. setVolumeConfig (called from App.vue) overwrites
  // this once member prefs load. Inline defaults avoid a config.ts init cycle.
  volume_settings: Record<Bus, number> = { interface: 5, study: 5, hover: 5 }
  // The committed baseline — what the server gave us (or defaults). previewVolumeConfig
  // can drift volume_settings off this for live UI feedback; resetSettings restores it.
  committed_volume_settings: Record<Bus, number> = { ...this.volume_settings }

  // Commit a new baseline and apply it (App.vue, on member-pref load/save).
  setVolumeConfig = (settings: Record<Bus, number>) => {
    this.committed_volume_settings = { ...settings }
    this.volume_settings = { ...settings }
  }

  // Apply settings live without committing — for previewing edits mid-drag.
  previewVolumeConfig = (settings: Record<Bus, number>) => {
    this.volume_settings = { ...settings }
  }

  // Discard any preview and fall back to the committed baseline.
  resetSettings = () => {
    this.volume_settings = { ...this.committed_volume_settings }
  }

  setup = () => {
    if (this.initialized) return Promise.resolve()
    this.initialized = true

    this._registerUnlock()

    const loads = Object.entries(SOUNDS).map(([name, cfg]) => {
      const key = name as SoundKey
      const def: SoundDef = cfg
      return this._loadSound(key).then((buffer) => {
        this.loaded_sounds.set(key, {
          buffer,
          base_volume: def.default_volume ?? DEFAULT_VOLUME,
          default_bus: def.defaultBus ?? DEFAULT_BUS
        })
      })
    })

    return Promise.all(loads)
  }

  play = async (key: SoundKey, options: PlayOptions = {}): Promise<void> => {
    return debounce(() => this._play(key, options), {
      delay: options.debounce ?? DEBOUNCE_DELAY,
      key
    })
  }

  private _enqueue = (key: SoundKey, options: PlayOptions = {}) => {
    this.queued_sound = { key, options }

    setTimeout(() => {
      if (this.queued_sound?.key === key) {
        this.queued_sound = undefined
      }
    }, QUEUE_TIMEOUT)
  }

  private _play = async (key: SoundKey, options: PlayOptions = {}): Promise<void> => {
    if (!this.unlocked) {
      this._enqueue(key, options)
      return
    }

    const sound = this.loaded_sounds.get(key)

    if (!sound) {
      throw new Error(`Sound "${key}" not loaded.`)
    }

    // A muted bus (volume 0) has nothing to play. Bail before resuming the
    // audio context — resume() steals media-session focus and pauses the
    // user's background music, even for a silent buffer.
    const volume = options.volume ?? sound.base_volume * this._getVolumeMultiplier(sound, options)

    if (volume <= 0) return

    const running = await engine.resume()

    if (!running) return

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
        resolve()
      }

      const { ended } = engine.play(sound.buffer, volume)
      const fallbackMs = Math.ceil((sound.buffer.duration || 1) * 1000) + 500
      const timer = setTimeout(settle, fallbackMs)

      void ended.then(settle)
    })
  }

  // Bus is resolved most-specific-first: explicit option, then the sound's own
  // default, then 'interface' (baked into default_bus). 5 is the resting
  // setting, so dividing by 5 yields a 1.0× multiplier at rest — sounds play at
  // their designed volume unchanged.
  private _getVolumeMultiplier(sound: LoadedSound, options: PlayOptions): number {
    const bus = options.bus ?? sound.default_bus
    return this.volume_settings[bus] / 5
  }

  private _loadSound(key: SoundKey): Promise<AudioBuffer> {
    const def: SoundDef = SOUNDS[key]
    const ext = def.ext ?? 'wav'
    const path = `/src/assets/audio/${key}.${ext}`

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

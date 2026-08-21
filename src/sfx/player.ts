import engine from '@/sfx/engine'
import { debounce } from '@/utils/debounce'
import { BUS_DEFAULTS, SOUNDS, type Bus, type SoundDef, type SoundKey } from '@/sfx/config'

export type PlayOptions = {
  debounce?: number
  // Overrides the sound's own bus, which otherwise falls back to 'interface'.
  bus?: Bus
}

type LoadedSound = {
  buffer: AudioBuffer
  base_volume: number
  default_bus: Bus
}

// Keep `query: '?url'` — it captures URL strings only, so no audio payload
// lands in the JS bundle.
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
  queued_sound: { key: SoundKey; options: PlayOptions } | undefined
  // The levels actually used to play. A preview can drift these off the
  // baseline below, so never read them to decide what to save.
  volume_settings: Record<Bus, number> = { ...BUS_DEFAULTS }
  // The member's saved levels — what a discarded preview falls back to.
  committed_volume_settings: Record<Bus, number> = { ...BUS_DEFAULTS }

  // Commits a new baseline and applies it.
  setVolumeConfig = (settings: Record<Bus, number>) => {
    this.committed_volume_settings = { ...settings }
    this.volume_settings = { ...settings }
  }

  // Applies settings without committing, so a slider drag can be heard live.
  previewVolumeConfig = (settings: Record<Bus, number>) => {
    this.volume_settings = { ...settings }
  }

  // Discards any preview and falls back to the committed baseline.
  resetSettings = () => {
    this.volume_settings = { ...this.committed_volume_settings }
  }

  setup = () => {
    if (this.initialized) return Promise.resolve()
    this.initialized = true

    engine.onUnlock(this._onUnlock)

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
    if (!engine.isUnlocked()) {
      this._enqueue(key, options)
      return
    }

    const sound = this.loaded_sounds.get(key)
    if (!sound) throw new Error(`Sound "${key}" not loaded.`)

    // Bail before touching the context — waking it steals audio focus and
    // pauses whatever the person is listening to, even at zero volume.
    const volume = sound.base_volume * this._getVolumeMultiplier(sound, options)
    if (volume <= 0) return

    return engine.play(sound.buffer, volume)
  }

  // 5 is the resting setting, so the divisor keeps a rested bus at 1.0× and
  // sounds play at exactly the volume they were designed at.
  private _getVolumeMultiplier(sound: LoadedSound, options: PlayOptions): number {
    const bus = options.bus ?? sound.default_bus
    return this.volume_settings[bus] / 5
  }

  private _loadSound(key: SoundKey): Promise<AudioBuffer> {
    const def: SoundDef = SOUNDS[key]
    const ext = def.ext ?? 'wav'
    const path = `/src/assets/audio/${key}.${ext}`
    const url = AUDIO_FILES[path]

    if (!url) throw new Error(`Audio file not found for "${key}" (expected ${path})`)

    return engine.decode(url).catch((err) => {
      throw new Error(`Failed to load audio "${key}": ${String(err)}`)
    })
  }

  private _onUnlock = () => {
    if (this.queued_sound) {
      const { key, options } = this.queued_sound
      this.queued_sound = undefined
      void this._play(key, options)
    }
  }
}

export default new AudioPlayer()

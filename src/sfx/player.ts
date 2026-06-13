import { Howl, Howler } from 'howler'
import { debounce } from '@/utils/debounce'
import {
  AUDIO_CONFIG,
  type AudioCategoryKey,
  type AudioCategory,
  type AudioKey,
  type NamespacedAudioKey,
  type AudioProperties
} from '@/sfx/config'

export type PlayOptions = {
  volume?: number
  debounce?: number
  blocking?: boolean
}

// Audio files ship as separate hashed assets; Howler fetches them when
// setup() runs. The glob captures URL strings only — no binary payload
// lands in the JS bundle. setup() itself is invoked post-paint from
// App.vue so audio download never blocks first paint.
const AUDIO_FILES = import.meta.glob('@/assets/audio/**/*.{wav,mp3,ogg}', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>

const DEFAULT_VOLUME = 0.5
const DEFAULT_CATEGORY_VOLUME = 1
const DEBOUNCE_DELAY = 10
const QUEUE_TIMEOUT = 10

// Howler suspends the AudioContext after 30s of silence to save power, then
// relies on _autoResume() to revive it. On iOS that desyncs badly: locking the
// phone or backgrounding the tab also interrupts the audio session (WebKit's
// 'interrupted' ctx state), and Howler's internal state machine wedges so every
// later play() is silently dropped — while the audio-reader's HTMLAudioElement
// keeps working on its own audio session. SFX are tiny and infrequent, so the
// power saving isn't worth the silence; lifecycle.ts owns resume instead.
Howler.autoSuspend = false

class AudioPlayer {
  loaded_sounds = new Map<string, Howl>()
  initialized = false
  unlock_registered = false
  unlocked = false
  queued_sound: { key: NamespacedAudioKey; options: PlayOptions } | undefined
  blocking = false

  setup = () => {
    if (this.initialized) return Promise.resolve()
    this.initialized = true

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

    await this._ensureContextRunning()

    if (Howler.ctx && Howler.ctx.state !== 'running') {
      if (options.blocking) this.blocking = false
      return
    }

    return new Promise((resolve) => {
      // The returned Promise must settle in exactly one of three ways:
      //   1. 'end'       — Howler's normal completion event.
      //   2. 'playerror' — Howler failed to decode/play (e.g. autoplay policy).
      //   3. Timer       — neither of the above fired in time.
      //
      // (3) is the safety net: if the AudioContext suspends mid-play (tab hides
      // right after play, device locks) Howler never emits 'end' and the
      // promise would hang forever, stalling any caller that awaits emitSfx().
      //
      // Whichever path wins, settle() cancels the other two: clearing the
      // timer and off()-ing both handlers. The off() calls matter because
      // Howl.once() only auto-removes a handler when it fires — if the timer
      // wins, the 'end'/'playerror' subscriptions would otherwise leak,
      // holding resolve + timer references for the lifetime of the Howl.
      let settled = false
      const settle = () => {
        if (settled) return
        settled = true
        sound.off('end', settle)
        sound.off('playerror', settle)
        clearTimeout(timer)
        if (options.blocking) this.blocking = false
        resolve()
      }
      const fallbackMs = Math.ceil((sound.duration() || 1) * 1000) + 500
      const timer = setTimeout(settle, fallbackMs)

      sound.once('end', settle)
      sound.once('playerror', settle)
      sound.volume(options.volume ?? sound.volume())
      sound.play()
    })
  }

  private _ensureContextRunning = async (): Promise<void> => {
    const ctx = Howler.ctx
    if (!ctx || ctx.state === 'running') return
    try {
      await ctx.resume()
    } catch {
      // Suspension recovery needs a user gesture; lifecycle watcher handles it.
    }
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

      return this._createPreloadedHowl(key, cfg, volume).then((sound) => {
        this.loaded_sounds.set(key, sound)
      })
    })

    await Promise.all(loads)
  }

  private _createPreloadedHowl(
    key: NamespacedAudioKey,
    cfg: AudioProperties,
    volume: number
  ): Promise<Howl> {
    const audio_name = key.split('.')[1]
    const ext = cfg.ext ?? 'wav'
    const path = `/src/assets/audio/${audio_name}.${ext}`

    const url = AUDIO_FILES[path]

    return new Promise((resolve, reject) => {
      const sound = new Howl({
        src: [url],
        preload: cfg.preload ?? true,
        volume,
        onload: () => resolve(sound),
        onloaderror: (_, err) => reject(new Error(`Failed to load audio "${key}": ${String(err)}`))
      })

      this._registerUnlock(sound)
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
  private _registerUnlock = (sound: Howl) => {
    if (!this.unlock_registered) {
      this.unlock_registered = true
      sound.once('unlock', this._onUnlock)
    }
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

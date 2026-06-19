import logger from '@/utils/logger'
import { type AudioCategoryKey, type NamespacedAudioKey } from './config'
import player, { type PlayOptions } from './player'

type PolicyState = {
  enabled: boolean
  categories: { [key in AudioCategoryKey]: boolean }
  disable_hover_on_touch: boolean
}

let policy: PolicyState = {
  enabled: true,
  categories: { ui: true, study: true },
  disable_hover_on_touch: true
}

export function setSfxPolicy(partial: Partial<PolicyState>) {
  policy = { ...policy, ...partial }
}

/**
 * Plays a sound effect. Accepts a single key, an array of keys (one is picked
 * uniformly at random), or multiple key args (variadic random pick). The last
 * argument may optionally be a PlayOptions object.
 *
 * @returns A promise that resolves when the sound has finished playing.
 */
export async function emitSfx(audio_key: NamespacedAudioKey, opts?: PlayOptions): Promise<void>
export async function emitSfx(audio_keys: NamespacedAudioKey[], opts?: PlayOptions): Promise<void>
export async function emitSfx(
  audio_key_1: NamespacedAudioKey,
  audio_key_2: NamespacedAudioKey,
  ...rest: (NamespacedAudioKey | PlayOptions)[]
): Promise<void>
export async function emitSfx(
  ...args: (NamespacedAudioKey | NamespacedAudioKey[] | PlayOptions | undefined)[]
) {
  if (!policy.enabled) return

  let keys: NamespacedAudioKey[]
  let opts: PlayOptions

  if (Array.isArray(args[0])) {
    keys = args[0]
    opts = (args[1] as PlayOptions | undefined) ?? {}
  } else {
    const last = args[args.length - 1]
    const has_opts = last !== undefined && typeof last !== 'string'
    opts = (has_opts ? last : {}) as PlayOptions
    keys = (has_opts ? args.slice(0, -1) : args) as NamespacedAudioKey[]
  }

  if (keys.length === 0) return

  const key = keys.length === 1 ? keys[0] : keys[Math.floor(Math.random() * keys.length)]
  const category = _getCategoryFromKey(key)
  if (!policy.categories[category]) return

  try {
    await player.play(key, opts)
  } catch (e) {
    logger.error((e as Error).message, e)
  }
}

/**
 * Plays a sound effect. If touch is the primary input method, does nothing.
 *
 * @param event The key of the sound to play.
 * @param opts Options for playing the sound.
 * @returns A promise that resolves when the sound has finished playing.
 */
export function emitHoverSfx(
  event: NamespacedAudioKey | NamespacedAudioKey[],
  opts: PlayOptions = {}
) {
  if (policy.disable_hover_on_touch && _isTouchPrimary()) return

  return Array.isArray(event) ? emitSfx(event, opts) : emitSfx(event, opts)
}

function _isTouchPrimary(): boolean {
  return typeof window !== 'undefined' && 'ontouchstart' in window
}

function _getCategoryFromKey(audio_key: NamespacedAudioKey): AudioCategoryKey {
  return audio_key.split('.')[0] as AudioCategoryKey
}

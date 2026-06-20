import logger from '@/utils/logger'
import { type SoundKey } from './config'
import player, { type PlayOptions } from './player'

/**
 * Plays a sound effect. Pass a single key, or an array of keys to pick one
 * uniformly at random.
 *
 * @returns A promise that resolves when the sound has finished playing.
 */
export function emitSfx(keys: SoundKey | SoundKey[], opts: PlayOptions = {}): Promise<void> {
  const key = _pick(keys)
  if (!key) return Promise.resolve()

  return player.play(key, opts).catch((e) => logger.error((e as Error).message, e))
}

/**
 * Bus-scoped emitter for study-session sounds — sugar for
 * `emitSfx(keys, { bus: 'study' })` so study call sites don't repeat the bus.
 */
export function emitStudySfx(keys: SoundKey | SoundKey[], opts: PlayOptions = {}): Promise<void> {
  return emitSfx(keys, { ...opts, bus: 'study' })
}

/**
 * Plays a sound effect, unless touch is the primary input method (in which case
 * it does nothing). Used for hover feedback that shouldn't fire on tap.
 *
 * @returns A promise that resolves when the sound has finished playing.
 */
export function emitHoverSfx(keys: SoundKey | SoundKey[], opts: PlayOptions = {}): Promise<void> {
  if (_isTouchPrimary()) return Promise.resolve()
  return emitSfx(keys, opts)
}

function _pick(keys: SoundKey | SoundKey[]): SoundKey | undefined {
  if (!Array.isArray(keys)) return keys
  if (keys.length === 0) return undefined
  return keys[Math.floor(Math.random() * keys.length)]
}

function _isTouchPrimary(): boolean {
  return typeof window !== 'undefined' && 'ontouchstart' in window
}

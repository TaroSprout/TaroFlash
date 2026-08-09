import logger from '@/utils/logger'
import { type SoundKey } from './config'
import player, { type PlayOptions } from './player'
import { pointerStationaryAfterClick } from './pointer-activity'

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
 * Plays a hover sound, unless the hover isn't real.
 *
 * Silent on touch, and silent when the pointer hasn't moved since the last
 * click — that means the UI moved under a still cursor rather than the person
 * moving onto something, and the sound would collide with the click's own.
 *
 * @returns A promise that resolves when the sound has finished playing.
 */
export function emitHoverSfx(keys: SoundKey | SoundKey[], opts: PlayOptions = {}): Promise<void> {
  if (_isTouchPrimary()) return Promise.resolve()
  if (pointerStationaryAfterClick()) return Promise.resolve()
  return emitSfx(keys, { ...opts, bus: 'hover' })
}

function _pick(keys: SoundKey | SoundKey[]): SoundKey | undefined {
  if (!Array.isArray(keys)) return keys
  if (keys.length === 0) return undefined
  return keys[Math.floor(Math.random() * keys.length)]
}

function _isTouchPrimary(): boolean {
  return typeof window !== 'undefined' && 'ontouchstart' in window
}

import logger from '@/utils/logger'
import type { Bus, SoundKey } from './config'
import player from './player'
import { roleDef, type SfxRole } from './roles'
import { pointerStationaryAfterClick } from './pointer-activity'

/**
 * Plays the sound a role stands for.
 *
 * @param preview_bus - Only for the audio settings sliders, so a drag is heard
 *   on the bus that slider sets. It can move which volume dial scales the
 *   sound, never which sound plays.
 */
export function emitSfx(role: SfxRole, preview_bus?: Bus): Promise<void> {
  const def = roleDef(role)
  const key = _pick(def.sound)
  if (!key) return Promise.resolve()

  const bus = preview_bus ?? def.bus

  return player.play(key, { bus, debounce: def.debounce }).catch((e) => {
    logger.error((e as Error).message, e)
  })
}

/**
 * Plays a hover sound, unless the hover isn't real.
 *
 * Silent on touch, and silent when the pointer hasn't moved since the last
 * click — that means the UI moved under a still cursor rather than the person
 * moving onto something, and the sound would collide with the click's own.
 */
export function emitHoverSfx(role: SfxRole): Promise<void> {
  if (_isTouchPrimary()) return Promise.resolve()
  if (pointerStationaryAfterClick()) return Promise.resolve()
  return emitSfx(role)
}

function _pick(sound: SoundKey | SoundKey[]): SoundKey | undefined {
  if (!Array.isArray(sound)) return sound
  if (sound.length === 0) return undefined
  return sound[Math.floor(Math.random() * sound.length)]
}

function _isTouchPrimary(): boolean {
  return typeof window !== 'undefined' && 'ontouchstart' in window
}

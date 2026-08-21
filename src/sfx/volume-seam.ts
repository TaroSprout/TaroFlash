import player from './player'
import { toBusVolumes } from '@/utils/member/preferences'
import type { ResolvedMemberPreferences } from '@/utils/member/preferences'

// The one door between what the member set on the audio screen and what the
// player actually plays at. Nothing outside this module reaches the player.

type AudioPreferences = ResolvedMemberPreferences['audio']

/** Loads every sound file. Resolves once they are all decoded and playable. */
export function setupAudio(): Promise<unknown> {
  return player.setup()
}

/** Makes the member's saved levels the ones every later sound is scaled by. */
export function applyMemberVolumes(audio: AudioPreferences): void {
  player.setVolumeConfig(toBusVolumes(audio))
}

/** Plays at levels the member is still dragging towards, without saving them. */
export function previewMemberVolumes(audio: AudioPreferences): void {
  player.previewVolumeConfig(toBusVolumes(audio))
}

/** Throws away an unsaved preview and goes back to the member's saved levels. */
export function discardVolumePreview(): void {
  player.resetSettings()
}

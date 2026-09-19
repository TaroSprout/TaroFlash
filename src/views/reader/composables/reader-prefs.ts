import { useLocalRef } from '@/composables/storage/local-ref'
import type { ParagraphDensity } from '@/utils/transcript'

// Module-level so every reader instance and the settings panel share one source
// of truth, persisted across lessons and app sessions. Colocated with the other
// audio-reader composables rather than under the view, deliberately, to sit with
// its feature siblings.
const playback_rate = useLocalRef<number>('audio-reader.playbackRate', 1)
const paragraph_density = useLocalRef<ParagraphDensity>('audio-reader.paragraphDensity', 'medium')

export function useReaderPrefs() {
  return { playback_rate, paragraph_density }
}

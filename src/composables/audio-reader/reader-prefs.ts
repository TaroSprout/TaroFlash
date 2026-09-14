import { useLocalRef } from '@/composables/storage/local-ref'
import type { ParagraphDensity } from '@/utils/transcript'

/** How the reader lays out per-sentence translations. */
export type ReaderDisplayMode = 'inline' | 'fixed'

/** Which line the fixed translation band tracks. */
export type ReaderTranslationSource = 'playback' | 'scroll'

// Module-level so every reader instance and the settings panel share one source
// of truth, persisted across lessons and app sessions. Colocated with the other
// audio-reader composables rather than under the view, deliberately, to sit with
// its feature siblings.
const display_mode = useLocalRef<ReaderDisplayMode>('audio-reader.displayMode', 'inline')
const translation_source = useLocalRef<ReaderTranslationSource>(
  'audio-reader.translationSource',
  'playback'
)
const playback_rate = useLocalRef<number>('audio-reader.playbackRate', 1)
const paragraph_density = useLocalRef<ParagraphDensity>('audio-reader.paragraphDensity', 'medium')

// Opt into the prototype paged layout (static, non-overflowing pages with inline
// controls) instead of the scroll+dock reader. A no-chrome dev flag for now —
// `?paged=1` / `?paged=0` in the URL flips it (see the lesson view), otherwise it
// sticks per browser.
const paged = useLocalRef<boolean>('audio-reader.paged', false)

export function useReaderPrefs() {
  return { display_mode, translation_source, playback_rate, paragraph_density, paged }
}

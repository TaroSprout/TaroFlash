import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { getLessonAudioSignedUrl, SIGNED_URL_TTL_SECONDS } from '../db'

// A full hour, because asking again hands back a different address, and swapping
// the address mid-listen restarts the audio from the beginning.
const STALE_TIME_MS = SIGNED_URL_TTL_SECONDS * 1000

/** A playable address for a lesson's audio, good for an hour. */
export function useLessonAudioUrlQuery(path: MaybeRefOrGetter<string | undefined>) {
  return useQuery({
    key: () => ['lesson-audio', toValue(path) ?? ''],
    query: () => getLessonAudioSignedUrl(toValue(path) as string),
    enabled: () => Boolean(toValue(path)),
    staleTime: STALE_TIME_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  })
}

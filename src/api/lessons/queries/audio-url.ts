import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { getLessonAudioSignedUrl, SIGNED_URL_TTL_SECONDS } from '../db'

// This URL feeds the `<audio>` src directly, and every re-mint returns a *new*
// signed token — so any refetch swaps the src, which resets playback to 0 and
// drops the transcript cursor. Pinia Colada's defaults would do exactly that: it
// refetches stale queries on window focus and network reconnect, so pocketing the
// phone (tab hidden) and reopening it would restart the audio. Hold the same URL
// for the whole session instead — the token is valid an hour, well past a single
// listen — and leave re-minting to a fresh path or an explicit refresh().
const STALE_TIME_MS = SIGNED_URL_TTL_SECONDS * 1000

// Signed URLs expire (1h TTL), so this is cached server state keyed by path.
// The reader re-runs it on a fresh path; refresh() re-mints if a URL goes stale
// mid-session.
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

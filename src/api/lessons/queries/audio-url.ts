import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { getLessonAudioSignedUrl } from '../db'

// Signed URLs expire (1h TTL), so this is cached server state keyed by path.
// The reader re-runs it on a fresh path; refresh() re-mints if a URL goes stale
// mid-session.
export function useLessonAudioUrlQuery(path: MaybeRefOrGetter<string | undefined>) {
  return useQuery({
    key: () => ['lesson-audio', toValue(path) ?? ''],
    query: () => getLessonAudioSignedUrl(toValue(path) as string),
    enabled: () => Boolean(toValue(path))
  })
}

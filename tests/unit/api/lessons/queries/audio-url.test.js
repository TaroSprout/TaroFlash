import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { ref } from 'vue'

// useQuery spy returns the raw config so tests can inspect every option.
const { useQuerySpy, getLessonAudioSignedUrlMock } = vi.hoisted(() => ({
  useQuerySpy: vi.fn((cfg) => cfg),
  getLessonAudioSignedUrlMock: vi.fn().mockResolvedValue('https://example.com/signed')
}))

vi.mock('@pinia/colada', () => ({
  useQuery: useQuerySpy
}))

vi.mock('@/api/lessons/db', () => ({
  getLessonAudioSignedUrl: getLessonAudioSignedUrlMock,
  // SIGNED_URL_TTL_SECONDS must be the real constant so the assertion stays in sync
  SIGNED_URL_TTL_SECONDS: 3600
}))

import { useLessonAudioUrlQuery } from '@/api/lessons/queries/audio-url'

beforeEach(() => {
  useQuerySpy.mockClear()
  getLessonAudioSignedUrlMock.mockClear()
})

/** Call the hook and return the options object passed to useQuery. */
function configFrom(path) {
  useLessonAudioUrlQuery(path)
  return useQuerySpy.mock.calls.at(-1)[0]
}

describe('useLessonAudioUrlQuery', () => {
  describe('query key', () => {
    test('keys by ["lesson-audio", path] when path is a plain string', () => {
      const { key } = configFrom('lessons/abc.mp3')
      expect(key()).toEqual(['lesson-audio', 'lessons/abc.mp3'])
    })

    test('keys by ["lesson-audio", path] when path is a ref', () => {
      const { key } = configFrom(ref('lessons/xyz.mp3'))
      expect(key()).toEqual(['lesson-audio', 'lessons/xyz.mp3'])
    })

    test('keys with empty string when path ref is undefined', () => {
      const { key } = configFrom(ref(undefined))
      expect(key()).toEqual(['lesson-audio', ''])
    })
  })

  describe('enabled', () => {
    test('is true when path is a non-empty string', () => {
      const { enabled } = configFrom('lessons/abc.mp3')
      expect(enabled()).toBe(true)
    })

    test('is false when path ref is undefined', () => {
      const { enabled } = configFrom(ref(undefined))
      expect(enabled()).toBe(false)
    })

    test('is false when path ref is an empty string', () => {
      const { enabled } = configFrom(ref(''))
      expect(enabled()).toBe(false)
    })
  })

  describe('query function', () => {
    test('calls getLessonAudioSignedUrl with the resolved path', async () => {
      const { query } = configFrom('lessons/foo.mp3')
      await query()
      expect(getLessonAudioSignedUrlMock).toHaveBeenCalledWith('lessons/foo.mp3')
    })
  })

  describe('cache / refetch options [obligation]', () => {
    test('staleTime equals SIGNED_URL_TTL_SECONDS * 1000 (3_600_000 ms)', () => {
      const { staleTime } = configFrom('lessons/abc.mp3')
      // 3600 s × 1000 = 3_600_000 ms — the full token lifetime
      expect(staleTime).toBe(3_600_000)
    })

    test('refetchOnWindowFocus is false — focus must not re-mint the signed URL', () => {
      const { refetchOnWindowFocus } = configFrom('lessons/abc.mp3')
      expect(refetchOnWindowFocus).toBe(false)
    })

    test('refetchOnReconnect is false — reconnect must not re-mint the signed URL', () => {
      const { refetchOnReconnect } = configFrom('lessons/abc.mp3')
      expect(refetchOnReconnect).toBe(false)
    })
  })
})

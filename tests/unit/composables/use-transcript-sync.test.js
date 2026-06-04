import { describe, test, expect } from 'vite-plus/test'
import { ref } from 'vue'
import { useTranscriptSync } from '@/composables/use-transcript-sync'

const seg = (start, end, text = '') => ({ start, end, text })

describe('useTranscriptSync', () => {
  describe('empty segments', () => {
    test('returns -1 when segments array is empty', () => {
      const { active_index } = useTranscriptSync([], 0)
      expect(active_index.value).toBe(-1)
    })

    test('returns -1 for any time when segments array is empty', () => {
      const { active_index } = useTranscriptSync(() => [], 99)
      expect(active_index.value).toBe(-1)
    })
  })

  describe('t before first segment', () => {
    test('returns -1 when current_time is before the first segment start', () => {
      const { active_index } = useTranscriptSync([seg(5, 10)], 4.9)
      expect(active_index.value).toBe(-1)
    })

    test('returns -1 when current_time is 0 and first segment starts at 1', () => {
      const { active_index } = useTranscriptSync([seg(1, 3), seg(5, 8)], 0)
      expect(active_index.value).toBe(-1)
    })
  })

  describe('t exactly at a segment start', () => {
    test('returns that segment index when t equals start of first segment', () => {
      const { active_index } = useTranscriptSync([seg(5, 10)], 5)
      expect(active_index.value).toBe(0)
    })

    test('returns the correct index when t equals start of a middle segment', () => {
      const segs = [seg(0, 2), seg(5, 8), seg(10, 15)]
      const { active_index } = useTranscriptSync(segs, 5)
      expect(active_index.value).toBe(1)
    })

    test('returns the last index when t equals start of the last segment', () => {
      const segs = [seg(0, 2), seg(5, 8), seg(10, 15)]
      const { active_index } = useTranscriptSync(segs, 10)
      expect(active_index.value).toBe(2)
    })
  })

  describe('t inside a segment', () => {
    test('returns the active segment index when t is between start and end', () => {
      const segs = [seg(0, 3), seg(5, 10), seg(12, 20)]
      const { active_index } = useTranscriptSync(segs, 7)
      expect(active_index.value).toBe(1)
    })

    test('returns 0 when t is inside the first and only segment', () => {
      const { active_index } = useTranscriptSync([seg(0, 10)], 5)
      expect(active_index.value).toBe(0)
    })
  })

  describe('t in a gap after a segment has started', () => {
    test('holds the last started segment active through a silent gap', () => {
      // Segment 0 ends at 3, segment 1 starts at 8 — gap is [3, 8)
      const segs = [seg(0, 3), seg(8, 12)]
      const { active_index } = useTranscriptSync(segs, 5)
      // Segment 0 has started (start=0 <= 5), segment 1 has not (start=8 > 5)
      expect(active_index.value).toBe(0)
    })

    test('transitions to the next segment when t reaches its start', () => {
      const segs = [seg(0, 3), seg(8, 12)]
      const { active_index } = useTranscriptSync(segs, 8)
      expect(active_index.value).toBe(1)
    })
  })

  describe('t past the last segment', () => {
    test('holds the last segment active when t exceeds its end', () => {
      const segs = [seg(0, 2), seg(5, 8)]
      const { active_index } = useTranscriptSync(segs, 100)
      expect(active_index.value).toBe(1)
    })

    test('returns 0 (last segment index) when only one segment and t is past it', () => {
      const { active_index } = useTranscriptSync([seg(2, 5)], 99)
      expect(active_index.value).toBe(0)
    })
  })

  describe('reactivity', () => {
    test('active_index updates when current_time ref changes', () => {
      const segs = [seg(0, 3), seg(5, 8), seg(10, 15)]
      const t = ref(0)
      const { active_index } = useTranscriptSync(segs, t)

      expect(active_index.value).toBe(0)

      t.value = 5
      expect(active_index.value).toBe(1)

      t.value = 10
      expect(active_index.value).toBe(2)
    })

    test('active_index updates when segments getter returns new array', () => {
      const segs = ref([seg(0, 3)])
      const { active_index } = useTranscriptSync(() => segs.value, 10)

      // Only one segment so far — index 0 is the latest started
      expect(active_index.value).toBe(0)

      segs.value = [seg(0, 3), seg(5, 8), seg(8, 15)]
      expect(active_index.value).toBe(2)
    })

    test('returns -1 reactively when segments become empty', () => {
      const segs = ref([seg(0, 5)])
      const { active_index } = useTranscriptSync(() => segs.value, 2)

      expect(active_index.value).toBe(0)

      segs.value = []
      expect(active_index.value).toBe(-1)
    })

    test('accepts a getter for current_time and reacts to its backing ref', () => {
      const t = ref(0)
      const { active_index } = useTranscriptSync([seg(10, 20)], () => t.value)

      expect(active_index.value).toBe(-1)

      t.value = 10
      expect(active_index.value).toBe(0)
    })
  })
})

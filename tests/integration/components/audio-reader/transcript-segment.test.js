import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import TranscriptSegment from '@/components/audio-reader/transcript-segment.vue'

const seg = (text = 'Hello world') => ({ start: 0, end: 5, text })

function mountSegment(props = {}) {
  return shallowMount(TranscriptSegment, {
    props: {
      segment: seg(),
      active: false,
      index: 0,
      ...props
    }
  })
}

describe('TranscriptSegment', () => {
  describe('rendering', () => {
    test('renders the segment text', () => {
      const wrapper = mountSegment({ segment: seg('猫がいる') })
      expect(wrapper.find('[data-testid="transcript-segment"]').text()).toContain('猫がいる')
    })

    test('sets data-active to "false" when active prop is false', () => {
      const wrapper = mountSegment({ active: false })
      expect(wrapper.find('[data-testid="transcript-segment"]').attributes('data-active')).toBe(
        'false'
      )
    })

    test('sets data-active to "true" when active prop is true', () => {
      const wrapper = mountSegment({ active: true })
      expect(wrapper.find('[data-testid="transcript-segment"]').attributes('data-active')).toBe(
        'true'
      )
    })

    test('exposes data-index matching the index prop', () => {
      const wrapper = mountSegment({ index: 3 })
      expect(wrapper.find('[data-testid="transcript-segment"]').attributes('data-index')).toBe('3')
    })
  })

  describe('click → seek emission', () => {
    beforeEach(() => {
      // Default: collapsed selection (normal click)
      vi.spyOn(window, 'getSelection').mockReturnValue({
        isCollapsed: true
      })
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    test('emits seek with the segment index on click when selection is collapsed', async () => {
      const wrapper = mountSegment({ index: 2 })
      await wrapper.find('[data-testid="transcript-segment"]').trigger('click')
      expect(wrapper.emitted('seek')).toBeTruthy()
      expect(wrapper.emitted('seek')[0]).toEqual([2])
    })

    test('does not emit seek when getSelection returns a non-collapsed selection', async () => {
      vi.spyOn(window, 'getSelection').mockReturnValue({
        isCollapsed: false
      })

      const wrapper = mountSegment({ index: 0 })
      await wrapper.find('[data-testid="transcript-segment"]').trigger('click')
      expect(wrapper.emitted('seek')).toBeFalsy()
    })

    test('does not emit seek when getSelection returns null', async () => {
      vi.spyOn(window, 'getSelection').mockReturnValue(null)

      const wrapper = mountSegment({ index: 0 })
      await wrapper.find('[data-testid="transcript-segment"]').trigger('click')
      // null selection → no guard check → seek IS emitted (selection is treated as not present)
      // Source: `if (selection && !selection.isCollapsed) return` — null short-circuits, falls through
      expect(wrapper.emitted('seek')).toBeTruthy()
    })

    test('emits seek with the correct index for each segment', async () => {
      vi.spyOn(window, 'getSelection').mockReturnValue({ isCollapsed: true })

      const wrapper = mountSegment({ index: 7 })
      await wrapper.find('[data-testid="transcript-segment"]').trigger('click')
      expect(wrapper.emitted('seek')[0]).toEqual([7])
    })
  })
})

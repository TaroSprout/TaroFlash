import { describe, test, expect, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { Rating } from 'ts-fsrs'
import RatingButtons from '@/components/modals/study-session/session-flashcard/rating-buttons.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountRatingButtons(props) {
  return mount(RatingButtons, { props })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RatingButtons', () => {
  // ── side: 'front' ──────────────────────────────────────────────────────────

  describe('when side is "front"', () => {
    let wrapper

    beforeEach(() => {
      wrapper = mountRatingButtons({ side: 'front' })
    })

    test('shows the flip button', () => {
      expect(wrapper.find('[data-testid="rating-buttons__show"]').exists()).toBe(true)
    })

    test('does not show the Again button', () => {
      expect(wrapper.find('[data-testid="rating-buttons__again"]').exists()).toBe(false)
    })

    test('does not show the Good button', () => {
      expect(wrapper.find('[data-testid="rating-buttons__good"]').exists()).toBe(false)
    })

    test('does not show the start button', () => {
      expect(wrapper.find('[data-testid="rating-buttons__start"]').exists()).toBe(false)
    })

    test('clicking the flip button emits "revealed"', async () => {
      await wrapper.find('[data-testid="rating-buttons__show"]').trigger('click')

      expect(wrapper.emitted('revealed')).toHaveLength(1)
    })
  })

  // ── side: 'back' ───────────────────────────────────────────────────────────

  describe('when side is "back"', () => {
    let wrapper

    beforeEach(() => {
      wrapper = mountRatingButtons({ side: 'back' })
    })

    test('shows the Again button', () => {
      expect(wrapper.find('[data-testid="rating-buttons__again"]').exists()).toBe(true)
    })

    test('shows the Good button', () => {
      expect(wrapper.find('[data-testid="rating-buttons__good"]').exists()).toBe(true)
    })

    test('does not show the flip button', () => {
      expect(wrapper.find('[data-testid="rating-buttons__show"]').exists()).toBe(false)
    })

    test('does not show the start button', () => {
      expect(wrapper.find('[data-testid="rating-buttons__start"]').exists()).toBe(false)
    })

    test('clicking Again emits "rated" with Rating.Again', async () => {
      await wrapper.find('[data-testid="rating-buttons__again"]').trigger('click')

      expect(wrapper.emitted('rated')).toHaveLength(1)
      expect(wrapper.emitted('rated')[0]).toEqual([Rating.Again])
    })

    test('clicking Good emits "rated" with Rating.Good', async () => {
      await wrapper.find('[data-testid="rating-buttons__good"]').trigger('click')

      expect(wrapper.emitted('rated')).toHaveLength(1)
      expect(wrapper.emitted('rated')[0]).toEqual([Rating.Good])
    })
  })

  // ── side: 'cover' ──────────────────────────────────────────────────────────

  describe('when side is "cover"', () => {
    let wrapper

    beforeEach(() => {
      wrapper = mountRatingButtons({ side: 'cover' })
    })

    test('shows the start button', () => {
      expect(wrapper.find('[data-testid="rating-buttons__start"]').exists()).toBe(true)
    })

    test('does not show the flip button', () => {
      expect(wrapper.find('[data-testid="rating-buttons__show"]').exists()).toBe(false)
    })

    test('does not show the Again button', () => {
      expect(wrapper.find('[data-testid="rating-buttons__again"]').exists()).toBe(false)
    })

    test('does not show the Good button', () => {
      expect(wrapper.find('[data-testid="rating-buttons__good"]').exists()).toBe(false)
    })

    test('clicking the start button emits "started"', async () => {
      await wrapper.find('[data-testid="rating-buttons__start"]').trigger('click')

      expect(wrapper.emitted('started')).toHaveLength(1)
    })
  })

  // ── options prop ───────────────────────────────────────────────────────────

  test('renders without errors when options is undefined', () => {
    const wrapper = mountRatingButtons({ side: 'back', options: undefined })

    expect(wrapper.find('[data-testid="rating-buttons__again"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="rating-buttons__good"]').exists()).toBe(true)
  })
})

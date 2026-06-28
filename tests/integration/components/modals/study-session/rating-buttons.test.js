import { describe, test, expect, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { Rating } from 'ts-fsrs'
import RatingButtons from '@/components/study-session/session-flashcard/rating-buttons/index.vue'

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

    test('shows the flip button [obligation]', () => {
      expect(wrapper.find('[data-testid="rating-buttons__show"]').exists()).toBe(true)
    })

    test('does not show the Again button [obligation]', () => {
      expect(wrapper.find('[data-testid="rating-buttons__again"]').exists()).toBe(false)
    })

    test('does not show the start button [obligation]', () => {
      expect(wrapper.find('[data-testid="rating-buttons__start"]').exists()).toBe(false)
    })

    test('clicking the flip button emits "revealed"', async () => {
      await wrapper.find('[data-testid="rating-buttons__show"]').trigger('click')

      expect(wrapper.emitted('revealed')).toHaveLength(1)
    })

    test('flip button shown regardless of show_all_ratings [obligation]', () => {
      const w = mountRatingButtons({ side: 'front', show_all_ratings: true })
      expect(w.find('[data-testid="rating-buttons__show"]').exists()).toBe(true)
      const w2 = mountRatingButtons({ side: 'front', show_all_ratings: false })
      expect(w2.find('[data-testid="rating-buttons__show"]').exists()).toBe(true)
    })
  })

  // ── side: 'back' + show_all_ratings: true → advanced [obligation] ──────────

  describe('when side is "back" and show_all_ratings is true (advanced)', () => {
    let wrapper

    beforeEach(() => {
      wrapper = mountRatingButtons({ side: 'back', show_all_ratings: true })
    })

    test('renders the advanced rating buttons container [obligation]', () => {
      expect(wrapper.find('[data-testid="rating-buttons__advanced"]').exists()).toBe(true)
    })

    test('does not render the simple rating buttons container [obligation]', () => {
      expect(wrapper.find('[data-testid="rating-buttons__simple"]').exists()).toBe(false)
    })

    test('shows the Again button', () => {
      expect(wrapper.find('[data-testid="rating-buttons__again"]').exists()).toBe(true)
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
  })

  // ── side: 'back' + show_all_ratings: false → simple [obligation] ────────────

  describe('when side is "back" and show_all_ratings is false (simple)', () => {
    let wrapper

    beforeEach(() => {
      wrapper = mountRatingButtons({ side: 'back', show_all_ratings: false })
    })

    test('renders the simple rating buttons container [obligation]', () => {
      expect(wrapper.find('[data-testid="rating-buttons__simple"]').exists()).toBe(true)
    })

    test('does not render the advanced rating buttons container [obligation]', () => {
      expect(wrapper.find('[data-testid="rating-buttons__advanced"]').exists()).toBe(false)
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

  // ── side: 'back' default (show_all_ratings defaults to false) ──────────────

  describe('when side is "back" without show_all_ratings prop', () => {
    test('defaults to simple mode (show_all_ratings=false by default)', () => {
      const wrapper = mountRatingButtons({ side: 'back' })
      expect(wrapper.find('[data-testid="rating-buttons__simple"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="rating-buttons__advanced"]').exists()).toBe(false)
    })
  })

  // ── side: 'cover' ──────────────────────────────────────────────────────────

  describe('when side is "cover"', () => {
    let wrapper

    beforeEach(() => {
      wrapper = mountRatingButtons({ side: 'cover' })
    })

    test('shows the start button [obligation]', () => {
      expect(wrapper.find('[data-testid="rating-buttons__start"]').exists()).toBe(true)
    })

    test('does not show the flip button [obligation]', () => {
      expect(wrapper.find('[data-testid="rating-buttons__show"]').exists()).toBe(false)
    })

    test('does not show the Again button [obligation]', () => {
      expect(wrapper.find('[data-testid="rating-buttons__again"]').exists()).toBe(false)
    })

    test('clicking the start button emits "started"', async () => {
      await wrapper.find('[data-testid="rating-buttons__start"]').trigger('click')

      expect(wrapper.emitted('started')).toHaveLength(1)
    })

    test('start button shown regardless of show_all_ratings [obligation]', () => {
      const w = mountRatingButtons({ side: 'cover', show_all_ratings: true })
      expect(w.find('[data-testid="rating-buttons__start"]').exists()).toBe(true)
    })
  })
})

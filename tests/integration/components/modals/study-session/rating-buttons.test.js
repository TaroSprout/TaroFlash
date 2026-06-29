import { describe, test, expect, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { Rating } from 'ts-fsrs'
import RatingButtons from '@/components/study-session/session-flashcard/rating-buttons/index.vue'
import { PrimedGradeKey } from '@/components/study-session/session-flashcard/primed-grade-context'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountRatingButtons({ primed_grade = null, ...props } = {}) {
  return mount(RatingButtons, {
    props,
    global: { provide: { [PrimedGradeKey]: ref(primed_grade) } }
  })
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

    test('shows the flip button [obligation]', () => {
      expect(wrapper.find('[data-testid="rating-buttons__show"]').exists()).toBe(true)
    })

    test('does not show the start button', () => {
      expect(wrapper.find('[data-testid="rating-buttons__start"]').exists()).toBe(false)
    })

    test('clicking Again emits "rated" with Rating.Again', async () => {
      await wrapper.find('[data-testid="rating-buttons__again"]').trigger('click')

      expect(wrapper.emitted('rated')).toHaveLength(1)
      expect(wrapper.emitted('rated')[0]).toEqual([Rating.Again])
    })

    test('clicking the flip button emits "revealed" in advanced mode', async () => {
      await wrapper.find('[data-testid="rating-buttons__show"]').trigger('click')

      expect(wrapper.emitted('revealed')).toHaveLength(1)
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

    test('shows the flip button [obligation]', () => {
      expect(wrapper.find('[data-testid="rating-buttons__show"]').exists()).toBe(true)
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

    test('renders the start-container wrapping the start button [obligation]', () => {
      const container = wrapper.find('[data-testid="rating-buttons__start-container"]')
      expect(container.exists()).toBe(true)
      expect(container.find('[data-testid="rating-buttons__start"]').exists()).toBe(true)
    })

    test('does NOT render the advanced subcomponent on cover side [obligation]', () => {
      expect(wrapper.find('[data-testid="rating-buttons__advanced"]').exists()).toBe(false)
    })

    test('does NOT render the simple subcomponent on cover side [obligation]', () => {
      expect(wrapper.find('[data-testid="rating-buttons__simple"]').exists()).toBe(false)
    })
  })

  // ── primed_grade prop forwarding [obligation] ──────────────────────────────

  describe('primed_grade forwarding to advanced-rating-buttons', () => {
    test('primed_grade=Rating.Again marks again button active in advanced mode [obligation]', () => {
      const wrapper = mountRatingButtons({
        side: 'back',
        show_all_ratings: true,
        primed_grade: Rating.Again
      })
      expect(wrapper.find('[data-testid="rating-buttons__again"]').attributes('data-active')).toBe(
        'true'
      )
    })

    test('primed_grade=null leaves again button inactive in advanced mode [obligation]', () => {
      const wrapper = mountRatingButtons({
        side: 'back',
        show_all_ratings: true,
        primed_grade: null
      })
      expect(
        wrapper.find('[data-testid="rating-buttons__again"]').attributes('data-active')
      ).toBeUndefined()
    })
  })

  describe('primed_grade forwarding to simple-rating-buttons', () => {
    test('primed_grade=Rating.Again marks again button active in simple mode [obligation]', () => {
      const wrapper = mountRatingButtons({
        side: 'back',
        show_all_ratings: false,
        primed_grade: Rating.Again
      })
      expect(wrapper.find('[data-testid="rating-buttons__again"]').attributes('data-active')).toBe(
        'true'
      )
    })

    test('primed_grade=Rating.Good marks good button active in simple mode [obligation]', () => {
      const wrapper = mountRatingButtons({
        side: 'back',
        show_all_ratings: false,
        primed_grade: Rating.Good
      })
      expect(wrapper.find('[data-testid="rating-buttons__good"]').attributes('data-active')).toBe(
        'true'
      )
    })

    test('primed_grade=null leaves both buttons inactive in simple mode [obligation]', () => {
      const wrapper = mountRatingButtons({
        side: 'back',
        show_all_ratings: false,
        primed_grade: null
      })
      expect(
        wrapper.find('[data-testid="rating-buttons__again"]').attributes('data-active')
      ).toBeUndefined()
      expect(
        wrapper.find('[data-testid="rating-buttons__good"]').attributes('data-active')
      ).toBeUndefined()
    })
  })
})

import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { Rating } from 'ts-fsrs'
import RatingButtons from '@/views/study-session/session-studying/rating-buttons/index.vue'
import { PrimedGradeKey } from '@/views/study-session/session-studying/card/primed-grade-context'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
// rating-buttons/index.vue no longer takes side/show_all_ratings/loading as
// props — it reads them off the injected StudySessionController.

const { display_side, show_all_ratings, loading } = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return { display_side: ref('cover'), show_all_ratings: ref(false), loading: ref(false) }
})

vi.mock('@/views/study-session/composables/session-controller', () => ({
  useInjectedStudySessionController: () => ({ display_side, show_all_ratings, loading })
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountRatingButtons({
  side = 'cover',
  show_all_ratings: sar = false,
  loading: is_loading = false,
  primed_grade = null
} = {}) {
  display_side.value = side
  show_all_ratings.value = sar
  loading.value = is_loading

  return mount(RatingButtons, {
    global: { provide: { [PrimedGradeKey]: ref(primed_grade) } }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RatingButtons', () => {
  beforeEach(() => {
    display_side.value = 'cover'
    show_all_ratings.value = false
    loading.value = false
  })

  // ── side: 'front' ──────────────────────────────────────────────────────────

  describe('when side is "front"', () => {
    let wrapper

    beforeEach(() => {
      wrapper = mountRatingButtons({ side: 'front' })
    })

    test('does not show the start button [obligation]', () => {
      expect(wrapper.find('[data-testid="rating-buttons__start"]').exists()).toBe(false)
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

    test('does NOT render the advanced subcomponent on cover side [obligation]', () => {
      expect(wrapper.find('[data-testid="rating-buttons__advanced"]').exists()).toBe(false)
    })

    test('does NOT render the simple subcomponent on cover side [obligation]', () => {
      expect(wrapper.find('[data-testid="rating-buttons__simple"]').exists()).toBe(false)
    })
  })

  // ── side: 'cover' + loading prop [obligation] ───────────────────────────────

  describe('when side is "cover" and loading is true', () => {
    test('clicking the start button does NOT emit "started" while loading [obligation]', async () => {
      const wrapper = mountRatingButtons({ side: 'cover', loading: true })
      await wrapper.find('[data-testid="rating-buttons__start"]').trigger('click')

      expect(wrapper.emitted('started')).toBeUndefined()
    })

    test('the start button is disabled while loading [obligation]', () => {
      const wrapper = mountRatingButtons({ side: 'cover', loading: true })
      expect(
        wrapper.find('[data-testid="rating-buttons__start"]').attributes('aria-disabled')
      ).toBe('true')
    })
  })

  describe('when side is "cover" and loading is false', () => {
    test('clicking the start button emits "started" when not loading [obligation]', async () => {
      const wrapper = mountRatingButtons({ side: 'cover', loading: false })
      await wrapper.find('[data-testid="rating-buttons__start"]').trigger('click')

      expect(wrapper.emitted('started')).toHaveLength(1)
    })

    test('the start button is not disabled when not loading [obligation]', () => {
      const wrapper = mountRatingButtons({ side: 'cover', loading: false })
      expect(
        wrapper.find('[data-testid="rating-buttons__start"]').attributes('aria-disabled')
      ).toBeUndefined()
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

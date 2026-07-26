import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { Rating } from 'ts-fsrs'
import SimpleRatingButtons from '@/views/study-session/session-studying/rating-buttons/simple.vue'
import { PrimedGradeKey } from '@/views/study-session/session-studying/card/primed-grade-context'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { show_button_preview, rating_times } = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    show_button_preview: ref(false),
    rating_times: ref({ bare: {}, label: {} })
  }
})

vi.mock('@/views/study-session/composables/session-controller', () => ({
  useInjectedStudySessionController: () => ({ show_button_preview, rating_times })
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountSimple({ primed_grade = null } = {}) {
  return mount(SimpleRatingButtons, {
    global: { provide: { [PrimedGradeKey]: ref(primed_grade) } }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SimpleRatingButtons', () => {
  beforeEach(() => {
    show_button_preview.value = false
    rating_times.value = { bare: {}, label: {} }
  })

  // ── show_button_preview swaps icon-words for projected intervals [obligation] ─

  describe('button preview [obligation]', () => {
    test('shows the projected interval label instead of icon-word copy when preview is on and ready [obligation]', () => {
      show_button_preview.value = true
      rating_times.value = { bare: { [Rating.Again]: '1d', [Rating.Good]: '3d' }, label: {} }
      const wrapper = mountSimple()

      expect(wrapper.find('[data-testid="rating-buttons__again"]').text()).toContain('1d')
      expect(wrapper.find('[data-testid="rating-buttons__good"]').text()).toContain('3d')
    })

    test('falls back to icon-word copy when preview is on but the frozen times are not ready [obligation]', () => {
      show_button_preview.value = true
      rating_times.value = { bare: {}, label: {} }
      const wrapper = mountSimple()

      expect(wrapper.find('[data-testid="rating-buttons__again"]').text()).toContain('Nope')
    })

    test('shows the icon-word copy when preview is off, even with ready times [obligation]', () => {
      show_button_preview.value = false
      rating_times.value = { bare: { [Rating.Again]: '1d', [Rating.Good]: '3d' }, label: {} }
      const wrapper = mountSimple()

      expect(wrapper.find('[data-testid="rating-buttons__again"]').text()).toContain('Nope')
      expect(wrapper.find('[data-testid="rating-buttons__good"]').text()).toContain('Got It')
    })
  })

  // ── Unconditional rendering [obligation] ───────────────────────────────────
  // Single grid row with again + good buttons.

  test('renders the again button unconditionally [obligation]', () => {
    const wrapper = mountSimple()
    expect(wrapper.find('[data-testid="rating-buttons__again"]').exists()).toBe(true)
  })

  test('renders the good button unconditionally [obligation]', () => {
    const wrapper = mountSimple()
    expect(wrapper.find('[data-testid="rating-buttons__good"]').exists()).toBe(true)
  })

  test('again and good buttons are siblings in the simple grid container [obligation]', () => {
    const wrapper = mountSimple()
    const container = wrapper.find('[data-testid="rating-buttons__simple"]')
    expect(container.find('[data-testid="rating-buttons__again"]').exists()).toBe(true)
    expect(container.find('[data-testid="rating-buttons__good"]').exists()).toBe(true)
  })

  // ── primed_grade → again button active [obligation] ───────────────────────

  test('primed_grade=Rating.Again marks again button as active [obligation]', () => {
    const wrapper = mountSimple({ primed_grade: Rating.Again })
    expect(wrapper.find('[data-testid="rating-buttons__again"]').attributes('data-active')).toBe(
      'true'
    )
  })

  test('primed_grade !== Rating.Again leaves again button inactive [obligation]', () => {
    const wrapper = mountSimple({ primed_grade: Rating.Good })
    expect(
      wrapper.find('[data-testid="rating-buttons__again"]').attributes('data-active')
    ).toBeUndefined()
  })

  // ── primed_grade → good button active [obligation] ────────────────────────

  test('primed_grade=Rating.Good marks good button as active [obligation]', () => {
    const wrapper = mountSimple({ primed_grade: Rating.Good })
    expect(wrapper.find('[data-testid="rating-buttons__good"]').attributes('data-active')).toBe(
      'true'
    )
  })

  test('primed_grade !== Rating.Good leaves good button inactive [obligation]', () => {
    const wrapper = mountSimple({ primed_grade: Rating.Again })
    expect(
      wrapper.find('[data-testid="rating-buttons__good"]').attributes('data-active')
    ).toBeUndefined()
  })

  test('primed_grade=null leaves both buttons inactive [obligation]', () => {
    const wrapper = mountSimple({ primed_grade: null })
    expect(
      wrapper.find('[data-testid="rating-buttons__again"]').attributes('data-active')
    ).toBeUndefined()
    expect(
      wrapper.find('[data-testid="rating-buttons__good"]').attributes('data-active')
    ).toBeUndefined()
  })

  // ── Event emission ────────────────────────────────────────────────────────

  test('pressing again button emits rated with Rating.Again', async () => {
    const wrapper = mountSimple()
    await wrapper.find('[data-testid="rating-buttons__again"]').trigger('click')
    expect(wrapper.emitted('rated')?.[0]).toEqual([Rating.Again])
  })

  test('pressing good button emits rated with Rating.Good', async () => {
    const wrapper = mountSimple()
    await wrapper.find('[data-testid="rating-buttons__good"]').trigger('click')
    expect(wrapper.emitted('rated')?.[0]).toEqual([Rating.Good])
  })
})

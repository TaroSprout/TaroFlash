import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { Rating } from 'ts-fsrs'
import SimpleRatingButtons from '@/components/flashcard-session/session-studying/rating-buttons/simple.vue'
import { PrimedGradeKey } from '@/components/flashcard-session/session-studying/card/primed-grade-context'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountSimple({ primed_grade = null } = {}) {
  return mount(SimpleRatingButtons, {
    global: { provide: { [PrimedGradeKey]: ref(primed_grade) } }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SimpleRatingButtons', () => {
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

import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { Rating } from 'ts-fsrs'
import AdvancedRatingButtons from '@/components/study-session/session-flashcard/rating-buttons/advanced.vue'
import { PrimedGradeKey } from '@/components/study-session/session-flashcard/primed-grade-context'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountAdvanced({ primed_grade = null } = {}) {
  return mount(AdvancedRatingButtons, {
    global: { provide: { [PrimedGradeKey]: ref(primed_grade) } }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AdvancedRatingButtons', () => {
  // ── Unconditional rendering [obligation] ───────────────────────────────────
  // No side prop, no visibility conditionals — both rows always present.

  test('renders the success button group unconditionally [obligation]', () => {
    const wrapper = mountAdvanced()
    expect(wrapper.find('[data-testid="rating-buttons__success-group"]').exists()).toBe(true)
  })

  test('renders the action row unconditionally [obligation]', () => {
    const wrapper = mountAdvanced()
    expect(wrapper.find('[data-testid="rating-buttons__action-row"]').exists()).toBe(true)
  })

  test('renders the again button unconditionally [obligation]', () => {
    const wrapper = mountAdvanced()
    expect(wrapper.find('[data-testid="rating-buttons__again"]').exists()).toBe(true)
  })

  test('renders the flip (show) button unconditionally [obligation]', () => {
    const wrapper = mountAdvanced()
    expect(wrapper.find('[data-testid="rating-buttons__show"]').exists()).toBe(true)
  })

  // ── primed_grade → again button active [obligation] ───────────────────────

  test('primed_grade=Rating.Again marks again button as active [obligation]', () => {
    const wrapper = mountAdvanced({ primed_grade: Rating.Again })
    expect(wrapper.find('[data-testid="rating-buttons__again"]').attributes('data-active')).toBe(
      'true'
    )
  })

  test('primed_grade !== Rating.Again leaves again button inactive [obligation]', () => {
    const wrapper = mountAdvanced({ primed_grade: Rating.Good })
    expect(
      wrapper.find('[data-testid="rating-buttons__again"]').attributes('data-active')
    ).toBeUndefined()
  })

  test('primed_grade=null leaves again button inactive [obligation]', () => {
    const wrapper = mountAdvanced({ primed_grade: null })
    expect(
      wrapper.find('[data-testid="rating-buttons__again"]').attributes('data-active')
    ).toBeUndefined()
  })

  // ── primed_grade → button group active_value [obligation] ─────────────────
  // The button group receives :active_value="primed_grade ?? undefined".
  // Each button in the group gets :active="option.value === active_value".
  // Rating values: Hard=3, Good=4, Easy=5 — buttons ordered [Hard, Good, Easy].

  test('primed_grade=Rating.Good activates the Good button in the success group [obligation]', () => {
    const wrapper = mountAdvanced({ primed_grade: Rating.Good })
    const buttons = wrapper.findAll('[data-testid="ui-button-group__button"]')
    // Good is the middle button (index 1 in [Hard, Good, Easy])
    const good_btn = buttons.find((b) => b.attributes('data-active') === 'true')
    expect(good_btn).toBeTruthy()
  })

  test('primed_grade=null activates no button in the success group [obligation]', () => {
    const wrapper = mountAdvanced({ primed_grade: null })
    const buttons = wrapper.findAll('[data-testid="ui-button-group__button"]')
    for (const btn of buttons) {
      expect(btn.attributes('data-active')).toBeUndefined()
    }
  })

  // ── Event emission ────────────────────────────────────────────────────────

  test('pressing the again button emits rated with Rating.Again', async () => {
    const wrapper = mountAdvanced()
    await wrapper.find('[data-testid="rating-buttons__again"]').trigger('click')
    expect(wrapper.emitted('rated')?.[0]).toEqual([Rating.Again])
  })

  test('pressing a button in the success group emits rated with that grade [obligation]', async () => {
    const wrapper = mountAdvanced()
    // The button group has Hard/Good/Easy buttons ordered [Hard, Good, Easy].
    const group_buttons = wrapper.findAll('[data-testid="ui-button-group__button"]')
    expect(group_buttons.length).toBe(3)
    // Click Hard (index 0)
    await group_buttons[0].trigger('click')
    expect(wrapper.emitted('rated')).toHaveLength(1)
    expect(wrapper.emitted('rated')[0][0]).toBe(Rating.Hard)
  })

  test('pressing the flip button emits revealed [obligation]', async () => {
    const wrapper = mountAdvanced()
    await wrapper.find('[data-testid="rating-buttons__show"]').trigger('click')
    expect(wrapper.emitted('revealed')).toHaveLength(1)
  })
})

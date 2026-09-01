import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { Rating } from 'ts-fsrs'
import AdvancedRatingButtons from '@/views/study-session/session-studying/rating-buttons/advanced.vue'
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

function mountAdvanced({ primed_grade = null } = {}) {
  return mount(AdvancedRatingButtons, {
    global: { provide: { [PrimedGradeKey]: ref(primed_grade) } }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AdvancedRatingButtons', () => {
  beforeEach(() => {
    show_button_preview.value = false
    rating_times.value = { bare: {}, label: {} }
  })

  // ── show_button_preview swaps icons/words for projected intervals ─

  describe('button preview', () => {
    test('shows the projected interval label instead of the icon-word when preview is on and ready', () => {
      show_button_preview.value = true
      rating_times.value = {
        bare: {
          [Rating.Again]: '1d',
          [Rating.Hard]: '2d',
          [Rating.Good]: '3d',
          [Rating.Easy]: '5d'
        },
        label: {}
      }
      const wrapper = mountAdvanced()

      expect(wrapper.find('[data-testid="rating-buttons__again"]').text()).toBe('1d')
    })

    test('falls back to icon-word copy when preview is on but the frozen times are not ready', () => {
      show_button_preview.value = true
      rating_times.value = { bare: {}, label: {} }
      const wrapper = mountAdvanced()

      expect(wrapper.find('[data-testid="rating-buttons__again"]').text()).not.toBe('')
      expect(wrapper.find('[data-testid="rating-buttons__again"]').text()).toContain('Nope!')
    })

    test('shows the icon-word copy when preview is off, even with ready times', () => {
      show_button_preview.value = false
      rating_times.value = {
        bare: {
          [Rating.Again]: '1d',
          [Rating.Hard]: '2d',
          [Rating.Good]: '3d',
          [Rating.Easy]: '5d'
        },
        label: {}
      }
      const wrapper = mountAdvanced()

      expect(wrapper.find('[data-testid="rating-buttons__again"]').text()).toContain('Nope!')
    })
  })

  // ── Unconditional rendering ───────────────────────────────────
  // Single flex row: fail button (left, shrink-0) + button group (flex-1).

  test('renders the success button group unconditionally', () => {
    const wrapper = mountAdvanced()
    expect(wrapper.find('[data-testid="rating-buttons__success-group"]').exists()).toBe(true)
  })

  test('renders the again button unconditionally', () => {
    const wrapper = mountAdvanced()
    expect(wrapper.find('[data-testid="rating-buttons__again"]').exists()).toBe(true)
  })

  test('again button and success group are siblings in the advanced container', () => {
    const wrapper = mountAdvanced()
    const container = wrapper.find('[data-testid="rating-buttons__advanced"]')
    expect(container.find('[data-testid="rating-buttons__again"]').exists()).toBe(true)
    expect(container.find('[data-testid="rating-buttons__success-group"]').exists()).toBe(true)
  })

  // ── primed_grade → again button active ───────────────────────

  test('primed_grade=Rating.Again marks again button as active', () => {
    const wrapper = mountAdvanced({ primed_grade: Rating.Again })
    expect(wrapper.find('[data-testid="rating-buttons__again"]').attributes('data-active')).toBe(
      'true'
    )
  })

  test('primed_grade !== Rating.Again leaves again button inactive', () => {
    const wrapper = mountAdvanced({ primed_grade: Rating.Good })
    expect(
      wrapper.find('[data-testid="rating-buttons__again"]').attributes('data-active')
    ).toBeUndefined()
  })

  test('primed_grade=null leaves again button inactive', () => {
    const wrapper = mountAdvanced({ primed_grade: null })
    expect(
      wrapper.find('[data-testid="rating-buttons__again"]').attributes('data-active')
    ).toBeUndefined()
  })

  // ── primed_grade → button group active_value ─────────────────
  // The button group receives :active_value="primed_grade ?? undefined".
  // Each button in the group gets :active="option.value === active_value".
  // Rating values: Hard=3, Good=4, Easy=5 — buttons ordered [Hard, Good, Easy].

  test('primed_grade=Rating.Good activates the Good button in the success group', () => {
    const wrapper = mountAdvanced({ primed_grade: Rating.Good })
    const buttons = wrapper.findAll('[data-testid="ui-button-group__button"]')
    // Good is the middle button (index 1 in [Hard, Good, Easy])
    const good_btn = buttons.find((b) => b.attributes('data-active') === 'true')
    expect(good_btn).toBeTruthy()
  })

  test('primed_grade=null activates no button in the success group', () => {
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

  // ── success-group labels are untouched by the fail-button key swap ─

  test('renders Tough/Good/Easy on the success-group buttons when preview is off', () => {
    const wrapper = mountAdvanced()
    const buttons = wrapper.findAll('[data-testid="ui-button-group__button"]')
    expect(buttons[0].text()).toContain('Tough')
    expect(buttons[1].text()).toContain('Good')
    expect(buttons[2].text()).toContain('Easy')
  })

  test('pressing a button in the success group emits rated with that grade', async () => {
    const wrapper = mountAdvanced()
    // The button group has Hard/Good/Easy buttons ordered [Hard, Good, Easy].
    const group_buttons = wrapper.findAll('[data-testid="ui-button-group__button"]')
    expect(group_buttons.length).toBe(3)
    // Click Hard (index 0)
    await group_buttons[0].trigger('click')
    expect(wrapper.emitted('rated')).toHaveLength(1)
    expect(wrapper.emitted('rated')[0][0]).toBe(Rating.Hard)
  })
})

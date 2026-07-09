import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, reactive } from 'vue'
import RatingsSection from '@/views/settings/tab-review-preferences/ratings-section.vue'
import { memberEditorKey } from '@/composables/member/editor'

// ── Stubs ─────────────────────────────────────────────────────────────────────

const LabeledSectionStub = defineComponent({
  name: 'LabeledSection',
  props: { label: String, description: String },
  setup(props, { slots }) {
    return () =>
      h('div', { 'data-testid': 'labeled-section', 'data-label': props.label }, slots.default?.())
  }
})

const ReviewRatingsToggleStub = defineComponent({
  name: 'ReviewRatingsToggle',
  props: { value: Boolean },
  emits: ['update:value'],
  setup(props, { emit }) {
    return () =>
      h('button', {
        'data-testid': 'ratings-toggle-stub',
        'data-value': String(props.value),
        onClick: () => emit('update:value', !props.value)
      })
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSection(show_all_ratings = false) {
  const editor = { preferences: reactive({ study: { show_all_ratings } }) }
  const wrapper = mount(RatingsSection, {
    global: {
      stubs: { LabeledSection: LabeledSectionStub, ReviewRatingsToggle: ReviewRatingsToggleStub },
      mocks: { $t: (k) => k },
      provide: { [memberEditorKey]: editor }
    }
  })
  return { wrapper, editor }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RatingsSection', () => {
  test('renders the ratings container', () => {
    const { wrapper } = makeSection()
    expect(wrapper.find('[data-testid="tab-review-preferences__ratings"]').exists()).toBe(true)
  })

  test('binds the toggle to editor.preferences.study.show_all_ratings', () => {
    const { wrapper } = makeSection(true)
    expect(wrapper.find('[data-testid="ratings-toggle-stub"]').attributes('data-value')).toBe(
      'true'
    )
  })

  test('toggling updates editor.preferences.study.show_all_ratings [obligation]', async () => {
    const { wrapper, editor } = makeSection(false)
    await wrapper.find('[data-testid="ratings-toggle-stub"]').trigger('click')
    expect(editor.preferences.study.show_all_ratings).toBe(true)
  })
})

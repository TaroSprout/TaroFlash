import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { computed, defineComponent, h } from 'vue'
import TabReviewPreferences from '@/components/settings/tab-review-preferences/index.vue'
import { settingsLayoutKey } from '@/components/settings/layout'

// ── Stubs ─────────────────────────────────────────────────────────────────────

const RatingsSectionStub = defineComponent({
  name: 'RatingsSection',
  setup: () => () => h('div', { 'data-testid': 'ratings-section-stub' })
})

const FsrsSectionStub = defineComponent({
  name: 'FsrsSection',
  setup: () => () => h('div', { 'data-testid': 'fsrs-section-stub' })
})

const SaveButtonStub = defineComponent({
  name: 'SettingsSaveButton',
  setup: () => () => h('div', { 'data-testid': 'settings-save-button-stub' })
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTab(layout_mode = 'sheet') {
  return mount(TabReviewPreferences, {
    global: {
      stubs: {
        RatingsSection: RatingsSectionStub,
        FsrsSection: FsrsSectionStub,
        SettingsSaveButton: SaveButtonStub
      },
      mocks: { $t: (k) => k },
      provide: { [settingsLayoutKey]: computed(() => layout_mode) }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TabReviewPreferences', () => {
  test('renders the tab container', () => {
    const wrapper = makeTab()
    expect(wrapper.find('[data-testid="tab-review-preferences"]').exists()).toBe(true)
  })

  test('renders the ratings and fsrs sections', () => {
    const wrapper = makeTab()
    expect(wrapper.find('[data-testid="ratings-section-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="fsrs-section-stub"]').exists()).toBe(true)
  })

  test('shows the save button on sheet layout', () => {
    const wrapper = makeTab('sheet')
    expect(wrapper.find('[data-testid="settings-save-button-stub"]').exists()).toBe(true)
  })

  test('hides the save button off sheet layout', () => {
    const wrapper = makeTab('desktop')
    expect(wrapper.find('[data-testid="settings-save-button-stub"]').exists()).toBe(false)
  })

  test('does not emit back (chrome-driven back replaced the inline button)', () => {
    const wrapper = makeTab()
    expect(wrapper.emitted('back')).toBeUndefined()
  })
})

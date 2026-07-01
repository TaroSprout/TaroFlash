import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { computed, defineComponent, h } from 'vue'
import TabReviewPreferences from '@/components/settings/tab-review-preferences/index.vue'
import { settingsLayoutKey } from '@/components/settings/layout'

// ── Stubs ─────────────────────────────────────────────────────────────────────

const NullStub = defineComponent({
  setup:
    (_p, { emit }) =>
    () =>
      h('div', { onClick: () => emit?.('back') })
})

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
        SettingsSaveButton: SaveButtonStub,
        SettingsBackButton: NullStub
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

  test('emits back when the back button fires', async () => {
    const wrapper = makeTab()
    await wrapper.findComponent(NullStub).trigger('click')
    expect(wrapper.emitted('back')).toHaveLength(1)
  })
})

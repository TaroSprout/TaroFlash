import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import SessionSettings from '@/views/study-session/session-settings/index.vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockShowAllRatings,
  mockShowRatingButtons,
  mockShowButtonPreview,
  mockShowCardPreview,
  mockMultiDeckOrdering,
  mockPrefsAreDefault,
  mockResetToDefaults
} = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    mockShowAllRatings: ref(false),
    mockShowRatingButtons: ref(true),
    mockShowButtonPreview: ref(false),
    mockShowCardPreview: ref(true),
    mockMultiDeckOrdering: ref('random'),
    mockPrefsAreDefault: ref(true),
    mockResetToDefaults: vi.fn()
  }
})

vi.mock('@/views/study-session/composables/session-controller', () => ({
  useInjectedStudySessionController: () => ({
    show_all_ratings: mockShowAllRatings,
    show_rating_buttons: mockShowRatingButtons,
    show_button_preview: mockShowButtonPreview,
    show_card_preview: mockShowCardPreview,
    multi_deck_ordering: mockMultiDeckOrdering,
    prefs_are_default: mockPrefsAreDefault,
    resetToDefaults: mockResetToDefaults
  })
}))

// is_coarse / is_mobile — both sourced from useMatchMedia. Desktop by default;
// individual tests flip is_mobile for the mobile-order-control branch.
const { mediaState } = vi.hoisted(() => ({
  mediaState: { is_coarse: { value: false }, is_mobile: { value: false } }
}))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: vi.fn((query) =>
    query === 'coarse' ? mediaState.is_coarse : mediaState.is_mobile
  )
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountSettings() {
  return mount(SessionSettings)
}

function findOption(wrapper, label) {
  return wrapper
    .findAll('[data-testid="ui-option-group__option"]')
    .find((el) => el.text() === label)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SessionSettings', () => {
  beforeEach(() => {
    mockShowAllRatings.value = false
    mockShowRatingButtons.value = true
    mockShowButtonPreview.value = false
    mockShowCardPreview.value = true
    mockMultiDeckOrdering.value = 'random'
    mockPrefsAreDefault.value = true
    mockResetToDefaults.mockClear()
    mediaState.is_coarse.value = false
    mediaState.is_mobile.value = false
  })

  test('renders the root and its three sections', () => {
    const wrapper = mountSettings()
    expect(wrapper.find('[data-testid="session-settings"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-settings__rating"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-settings__preview"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-settings__order"]').exists()).toBe(true)
  })

  // ── ratings_mode: writable computed over show_all_ratings [obligation] ────

  describe('ratings mode', () => {
    test('reflects "Simple" as the active option when show_all_ratings is false', () => {
      mockShowAllRatings.value = false
      const wrapper = mountSettings()
      expect(findOption(wrapper, 'Simple').attributes('data-active')).toBe('true')
    })

    test('reflects "Advanced" as the active option when show_all_ratings is true', () => {
      mockShowAllRatings.value = true
      const wrapper = mountSettings()
      expect(findOption(wrapper, 'Advanced').attributes('data-active')).toBe('true')
    })

    test('tapping "Advanced" sets show_all_ratings to true', async () => {
      const wrapper = mountSettings()
      await findOption(wrapper, 'Advanced').trigger('click')
      expect(mockShowAllRatings.value).toBe(true)
    })

    test('tapping "Simple" sets show_all_ratings to false', async () => {
      mockShowAllRatings.value = true
      const wrapper = mountSettings()
      await findOption(wrapper, 'Simple').trigger('click')
      expect(mockShowAllRatings.value).toBe(false)
    })
  })

  // ── show_rating_buttons toggle ─────────────────────────────────────────────

  test('the rating-buttons toggle reflects show_rating_buttons', () => {
    mockShowRatingButtons.value = false
    const wrapper = mountSettings()
    const toggle = wrapper.find(
      '[data-testid="session-settings__rating"] [data-testid="ui-kit-toggle"]'
    )
    expect(toggle.attributes('data-active')).toBe('false')
  })

  test('toggling the rating-buttons switch writes show_rating_buttons', async () => {
    mockShowRatingButtons.value = false
    const wrapper = mountSettings()
    const input = wrapper.find('[data-testid="session-settings__rating"] input[type="checkbox"]')
    await input.setValue(true)
    expect(mockShowRatingButtons.value).toBe(true)
  })

  // ── show_button_preview toggle, disabled when show_rating_buttons is off [obligation] ─

  describe('button preview toggle [obligation]', () => {
    test('is enabled (not data-disabled) when show_rating_buttons is true [obligation]', () => {
      mockShowRatingButtons.value = true
      const wrapper = mountSettings()
      const toggle = wrapper.find(
        '[data-testid="session-settings__preview"] [data-testid="ui-kit-toggle"]'
      )
      expect(toggle.attributes('data-disabled')).toBe('false')
    })

    test('is disabled when show_rating_buttons is false [obligation]', () => {
      mockShowRatingButtons.value = false
      const wrapper = mountSettings()
      const toggle = wrapper.find(
        '[data-testid="session-settings__preview"] [data-testid="ui-kit-toggle"]'
      )
      expect(toggle.attributes('data-disabled')).toBe('true')
    })

    test('reflects show_button_preview', () => {
      mockShowButtonPreview.value = true
      const wrapper = mountSettings()
      const toggle = wrapper.find(
        '[data-testid="session-settings__preview"] [data-testid="ui-kit-toggle"]'
      )
      expect(toggle.attributes('data-active')).toBe('true')
    })
  })

  // ── show_card_preview toggle ───────────────────────────────────────────────

  test('toggling the card-preview switch writes show_card_preview', async () => {
    mockShowCardPreview.value = true
    const wrapper = mountSettings()
    const toggles = wrapper.findAll(
      '[data-testid="session-settings__preview"] input[type="checkbox"]'
    )
    // second toggle in the preview section is card-preview
    await toggles[1].setValue(false)
    expect(mockShowCardPreview.value).toBe(false)
  })

  // ── multi_deck_ordering option group — desktop (actions slot) vs mobile [obligation] ─

  describe('multi-deck ordering control placement [obligation]', () => {
    test('renders exactly one order-control on desktop (actions slot) [obligation]', () => {
      mediaState.is_mobile.value = false
      const wrapper = mountSettings()
      expect(wrapper.findAll('[data-testid="session-settings__order-control"]')).toHaveLength(1)
    })

    test('renders exactly one order-control on mobile (below the label) [obligation]', () => {
      mediaState.is_mobile.value = true
      const wrapper = mountSettings()
      expect(wrapper.findAll('[data-testid="session-settings__order-control"]')).toHaveLength(1)
    })

    test('tapping "Shuffled" sets multi_deck_ordering to "random"', async () => {
      mockMultiDeckOrdering.value = 'sequential'
      const wrapper = mountSettings()
      await findOption(wrapper, 'Shuffled').trigger('click')
      expect(mockMultiDeckOrdering.value).toBe('random')
    })

    test('tapping "Sequential" sets multi_deck_ordering to "sequential"', async () => {
      mockMultiDeckOrdering.value = 'random'
      const wrapper = mountSettings()
      await findOption(wrapper, 'Sequential').trigger('click')
      expect(mockMultiDeckOrdering.value).toBe('sequential')
    })
  })

  // ── reset button ────────────────────────────────────────────────────────────

  describe('reset button', () => {
    test('is disabled when prefs_are_default is true', () => {
      mockPrefsAreDefault.value = true
      const wrapper = mountSettings()
      expect(
        wrapper.find('[data-testid="session-settings__reset"]').attributes('aria-disabled')
      ).toBe('true')
    })

    test('is enabled when prefs_are_default is false', () => {
      mockPrefsAreDefault.value = false
      const wrapper = mountSettings()
      expect(
        wrapper.find('[data-testid="session-settings__reset"]').attributes('aria-disabled')
      ).toBeUndefined()
    })

    test('pressing it calls resetToDefaults', async () => {
      mockPrefsAreDefault.value = false
      const wrapper = mountSettings()
      await wrapper.find('[data-testid="session-settings__reset"]').trigger('click')
      expect(mockResetToDefaults).toHaveBeenCalledOnce()
    })
  })
})

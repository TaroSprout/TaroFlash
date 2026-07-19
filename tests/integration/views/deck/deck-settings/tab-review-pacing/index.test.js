import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, reactive } from 'vue'
import { deckEditorKey } from '@/composables/deck/editor'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockPresetsData, mockDecksData } = vi.hoisted(() => ({
  mockPresetsData: { value: [] },
  mockDecksData: { value: [] }
}))
vi.mock('@/api/review-pacing', () => ({
  usePresetsQuery: () => ({ data: mockPresetsData }),
  useUpsertPresetMutation: () => ({ mutateAsync: vi.fn() }),
  useDeletePresetMutation: () => ({ mutateAsync: vi.fn() }),
  useSaveDeckPacingMutation: () => ({ mutateAsync: vi.fn() })
}))
vi.mock('@/api/decks', () => ({
  useMemberDecksQuery: () => ({ data: mockDecksData }),
  useMemberDeckCountQuery: () => ({ data: { value: 0 } }),
  useDeckQuery: () => ({ data: { value: undefined } }),
  useUpsertDeckMutation: () => ({ mutateAsync: vi.fn() }),
  useMoveDeckMutation: () => ({ mutateAsync: vi.fn() }),
  useDeleteDeckMutation: () => ({ mutateAsync: vi.fn() })
}))
vi.mock('@/stores/notice-store', () => ({
  useNoticeStore: () => ({ success: vi.fn(), error: vi.fn() })
}))
vi.mock('@/composables/alert', () => ({ useAlert: () => ({ warn: vi.fn() }) }))
vi.mock('@/composables/prompt', () => ({ usePrompt: () => ({ ask: vi.fn() }) }))

// SchedulingSection pulls in gsap timelines, media-query, sfx and local-ref —
// none of that is under test here, so it's stubbed to keep this suite scoped
// to the tab root's own wiring (provide/inject + section layout).
const SchedulingSectionStub = defineComponent({
  name: 'SchedulingSection',
  setup: () => () => h('div', { 'data-testid': 'scheduling-section-stub' })
})
const DeckSaveButtonStub = defineComponent({
  name: 'DeckSaveButton',
  setup: () => () => h('div', { 'data-testid': 'deck-save-button-stub' })
})

import TabReviewPacing from '@/views/deck/deck-settings/tab-review-pacing/index.vue'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SYSTEM_PRESET = { id: 1, name: 'Recommended', is_system: true, desired_retention: 90 }
const CUSTOM_PRESET = { id: 2, name: 'Aggressive', is_system: false, desired_retention: 95 }

function makeWrapper({ review_pacing_preset_id = null } = {}) {
  const deck = reactive({ id: 1, card_count: 100, desired_retention: 90 })
  const draft = reactive({
    study_config: { shuffle: false },
    review_pacing_preset_id,
    pacing_overrides: {}
  })
  const editor = { deck, draft, rebase: vi.fn() }
  const wrapper = mount(TabReviewPacing, {
    global: {
      provide: { [deckEditorKey]: editor },
      stubs: { SchedulingSection: SchedulingSectionStub, DeckSaveButton: DeckSaveButtonStub },
      mocks: { $t: (k) => k }
    }
  })
  return { wrapper, draft }
}

beforeEach(() => {
  mockPresetsData.value = [SYSTEM_PRESET, CUSTOM_PRESET]
})

// ── section layout ────────────────────────────────────────────────────────────

describe('TabReviewPacing — section layout', () => {
  test('renders the preset-header, general-section and limits-section in the deck column', () => {
    const { wrapper } = makeWrapper()
    const column = wrapper.find('[data-testid="tab-review-pacing__deck-column"]')
    expect(column.findComponent({ name: 'GeneralSection' }).exists()).toBe(true)
    expect(column.findComponent({ name: 'LimitsSection' }).exists()).toBe(true)
  })

  test('renders the preset-header above the two-column grid', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.findComponent({ name: 'PresetHeader' }).exists()).toBe(true)
  })

  test('renders scheduling-section and deck-save-button in the scheduling column', () => {
    const { wrapper } = makeWrapper()
    const column = wrapper.find('[data-testid="tab-review-pacing__scheduling-column"]')
    expect(column.find('[data-testid="scheduling-section-stub"]').exists()).toBe(true)
    expect(column.find('[data-testid="deck-save-button-stub"]').exists()).toBe(true)
  })

  test('renders the save button unconditionally — no layout-mode gate on this tab', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="deck-save-button-stub"]').exists()).toBe(true)
  })
})

// ── shared usePacingFields instance [obligation] ──────────────────────────────
// usePacingFields is resolved once at the tab root and shared via provide —
// every reader must reflect the SAME resolved preset, proving there's one
// subscription rather than each child re-deriving its own.

describe('TabReviewPacing — usePacingFields is provided once and shared [obligation]', () => {
  test('preset-header/preset-chip renders the system preset label when no preset is drafted', () => {
    const { wrapper } = makeWrapper({ review_pacing_preset_id: null })
    expect(wrapper.find('[data-testid="preset-chip"]').text()).toContain('Default')
  })

  test('preset-header/preset-chip reflects a drafted non-system preset by name [obligation]', () => {
    const { wrapper } = makeWrapper({ review_pacing_preset_id: 2 })
    expect(wrapper.find('[data-testid="preset-chip"]').text()).toContain('Aggressive')
  })

  test('preset-header shows no divergence and limits-section resolves caps off the same shared instance [obligation]', () => {
    const { wrapper } = makeWrapper({ review_pacing_preset_id: 2 })

    expect(wrapper.find('[data-testid="preset-header__divergence"]').exists()).toBe(false)
    const spinbox_input = wrapper
      .find('[data-testid="tab-review-pacing__max-reviews-spinbox"]')
      .find('[data-testid="ui-kit-spinbox__input"]')
    // CUSTOM_PRESET doesn't set max_reviews_per_day — a component re-deriving
    // its own usePacingFields instance from a different presets snapshot would
    // drift from this; sharing the one instance keeps it at the 0 sentinel.
    expect(spinbox_input.element.value).toBe('0')
  })
})

import { describe, test, expect, vi, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { pacingFieldsKey } from '@/views/deck/deck-settings/tab-review-pacing/use-pacing-fields'
import PresetHeader from '@/views/deck/deck-settings/tab-review-pacing/preset-header.vue'

// ── Mocks ─────────────────────────────────────────────────────────────────────
// Fade transitions resolve instantly so the reset button is present/absent
// synchronously under test.

const { mockFadeEnter, mockFadeLeave } = vi.hoisted(() => ({
  mockFadeEnter: vi.fn((_el, done) => done?.()),
  mockFadeLeave: vi.fn((_el, done) => done?.())
}))
vi.mock('@/utils/animations/fade', () => ({ fadeEnter: mockFadeEnter, fadeLeave: mockFadeLeave }))

const PresetChipStub = defineComponent({
  name: 'PresetChip',
  setup: () => () => h('div', { 'data-testid': 'preset-chip-stub' })
})

// ── Fixture ───────────────────────────────────────────────────────────────────

const mounted_wrappers = []

function makeWrapper({ override_count = 0 } = {}) {
  const resetAllOverrides = vi.fn()
  const pacing_fields = {
    override_count: ref(override_count),
    resetAllOverrides
  }
  const wrapper = mount(PresetHeader, {
    global: {
      provide: { [pacingFieldsKey]: pacing_fields },
      stubs: { PresetChip: PresetChipStub }
    },
    attachTo: document.body
  })
  mounted_wrappers.push(wrapper)
  return { wrapper, pacing_fields, resetAllOverrides }
}

afterEach(() => {
  mounted_wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
})

// ── reset button visibility ────────────────────────────────────

describe('PresetHeader — reset button visibility', () => {
  test('hides the reset button when override_count is 0', () => {
    const { wrapper } = makeWrapper({ override_count: 0 })
    expect(wrapper.find('[data-testid="preset-header__reset-all"]').exists()).toBe(false)
  })

  test('shows the reset button when override_count > 0', () => {
    const { wrapper } = makeWrapper({ override_count: 1 })
    expect(wrapper.find('[data-testid="preset-header__reset-all"]').exists()).toBe(true)
  })
})

// ── reset button label ─────────────────────────────────────────

describe('PresetHeader — reset button label', () => {
  test('renders "Reset (N)" with the current override_count, no singular/plural split', () => {
    const { wrapper } = makeWrapper({ override_count: 1 })
    expect(wrapper.find('[data-testid="preset-header__reset-all"] .btn-label').text()).toBe(
      'Reset (1)'
    )
  })

  test('renders the same "Reset (N)" shape for a count greater than one', () => {
    const { wrapper } = makeWrapper({ override_count: 3 })
    expect(wrapper.find('[data-testid="preset-header__reset-all"] .btn-label').text()).toBe(
      'Reset (3)'
    )
  })
})

// ── reset-all wiring ─────────────────────────────────────────────

describe('PresetHeader — preset-header__reset-all', () => {
  test('pressing reset-all calls resetAllOverrides', async () => {
    const { wrapper, resetAllOverrides } = makeWrapper({ override_count: 2 })

    await wrapper.find('[data-testid="preset-header__reset-all"]').trigger('click')

    expect(resetAllOverrides).toHaveBeenCalledOnce()
  })
})

// ── removed markup ──────────────────────────────────────────────

describe('PresetHeader — removed divergence markup', () => {
  test('never renders a preset-header__divergence or preset-header__count element', () => {
    const { wrapper } = makeWrapper({ override_count: 2 })
    expect(wrapper.find('[data-testid="preset-header__divergence"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="preset-header__count"]').exists()).toBe(false)
  })
})

// ── structure ─────────────────────────────────────────────────────────────────

describe('PresetHeader — structure', () => {
  test('renders the preset-chip inside its controls', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="preset-chip-stub"]').exists()).toBe(true)
  })
})

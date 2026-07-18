import { describe, test, expect, vi, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { pacingFieldsKey } from '@/views/deck/deck-settings/tab-review-pacing/use-pacing-fields'
import PresetHeader from '@/views/deck/deck-settings/tab-review-pacing/preset-header.vue'

// ── Mocks ─────────────────────────────────────────────────────────────────────
// Fade transitions resolve instantly so the divergence block is present/absent
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

// ── divergence visibility [obligation] ────────────────────────────────────────

describe('PresetHeader — divergence block visibility [obligation]', () => {
  test('hides the divergence block when override_count is 0 [obligation]', () => {
    const { wrapper } = makeWrapper({ override_count: 0 })
    expect(wrapper.find('[data-testid="preset-header__divergence"]').exists()).toBe(false)
  })

  test('shows the divergence block when override_count > 0, derived locally (has_overrides was removed from the composable) [obligation]', () => {
    const { wrapper } = makeWrapper({ override_count: 1 })
    expect(wrapper.find('[data-testid="preset-header__divergence"]').exists()).toBe(true)
  })
})

// ── pluralised count [obligation] ─────────────────────────────────────────────

describe('PresetHeader — preset-header__count pluralisation [obligation]', () => {
  test('singular phrasing for exactly one override', () => {
    const { wrapper } = makeWrapper({ override_count: 1 })
    expect(wrapper.find('[data-testid="preset-header__count"]').text()).toBe('1 change')
  })

  test('plural phrasing for more than one override', () => {
    const { wrapper } = makeWrapper({ override_count: 3 })
    expect(wrapper.find('[data-testid="preset-header__count"]').text()).toBe('3 changes')
  })
})

// ── reset-all wiring [obligation] ─────────────────────────────────────────────

describe('PresetHeader — preset-header__reset-all [obligation]', () => {
  test('pressing reset-all calls resetAllOverrides [obligation]', async () => {
    const { wrapper, resetAllOverrides } = makeWrapper({ override_count: 2 })

    await wrapper.find('[data-testid="preset-header__reset-all"]').trigger('click')

    expect(resetAllOverrides).toHaveBeenCalledOnce()
  })

  test('exposes its reset-all-label translation as the icon-only button tooltip', async () => {
    const { wrapper } = makeWrapper({ override_count: 1 })

    await wrapper
      .find('[data-testid="preset-header__reset-all"]')
      .trigger('pointerenter', { pointerType: 'mouse' })

    expect(document.querySelector('[data-testid="ui-tooltip"]').textContent.trim()).toBe(
      'Reset all'
    )
  })
})

// ── structure ─────────────────────────────────────────────────────────────────

describe('PresetHeader — structure', () => {
  test('renders the preset-chip inside its controls', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="preset-chip-stub"]').exists()).toBe(true)
  })
})

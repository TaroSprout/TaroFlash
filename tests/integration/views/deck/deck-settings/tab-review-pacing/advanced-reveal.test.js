import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'

const LOCAL_STORAGE_KEY = 'deck-settings-advanced-revealed'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

const { mockPopScrimReveal } = vi.hoisted(() => ({ mockPopScrimReveal: vi.fn() }))
vi.mock('@/utils/animations/scrim-reveal', () => ({ popScrimReveal: mockPopScrimReveal }))

const { mockIsPhone } = vi.hoisted(() => ({ mockIsPhone: { value: false } }))
vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: () => ({
    get value() {
      return mockIsPhone.value
    }
  })
}))

import AdvancedReveal from '@/views/deck/deck-settings/tab-review-pacing/advanced-reveal.vue'

// ── Fixture ───────────────────────────────────────────────────────────────────

const mounted_wrappers = []

function makeWrapper() {
  const wrapper = mount(AdvancedReveal, {
    slots: { default: '<div data-testid="advanced-reveal-content">content</div>' },
    global: { mocks: { $t: (k) => k } },
    attachTo: document.body
  })
  mounted_wrappers.push(wrapper)
  return { wrapper }
}

beforeEach(() => {
  mockIsPhone.value = false
  mockEmitSfx.mockClear()
  mockPopScrimReveal.mockClear()
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
  mounted_wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
})

// ── restored state paints at rest, no animation [obligation] ──────────────────

describe('AdvancedReveal — restored revealed state paints at rest on first render [obligation]', () => {
  test('a restored revealed=true renders the fields visible on first paint without calling popScrimReveal [obligation]', () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, 'true')
    const { wrapper } = makeWrapper()

    const fields = wrapper.find('[data-testid="advanced-reveal__fields"]')
    expect(fields.find('[data-testid="advanced-reveal-content"]').exists()).toBe(true)
    expect(mockPopScrimReveal).not.toHaveBeenCalled()
  })

  test('defaults to not-revealed when no persisted value exists', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="advanced-reveal__scrim"]').exists()).toBe(true)
  })
})

// ── toggling flips persistence [obligation] ───────────────────────────────────

describe('AdvancedReveal — toggling flips persistence [obligation]', () => {
  test('clicking the scrim persists revealed=true under deck-settings-advanced-revealed [obligation]', async () => {
    const { wrapper } = makeWrapper()

    await wrapper.find('[data-testid="advanced-reveal__scrim"]').trigger('click')

    expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toBe('true')
  })

  test('clicking the badge after reveal persists revealed=false [obligation]', async () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, 'true')
    const { wrapper } = makeWrapper()

    await wrapper.find('[data-testid="advanced-reveal__badge"]').trigger('click')

    expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toBe('false')
  })

  test('toggling plays the snappy_button_5 sfx', async () => {
    const { wrapper } = makeWrapper()

    await wrapper.find('[data-testid="advanced-reveal__scrim"]').trigger('click')

    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_5')
  })

  test('calls popScrimReveal with revealed=true on the reveal click', async () => {
    const { wrapper } = makeWrapper()

    await wrapper.find('[data-testid="advanced-reveal__scrim"]').trigger('click')

    expect(mockPopScrimReveal).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      true,
      expect.objectContaining({ collapse: false })
    )
  })
})

// ── collapse passed only on phone [obligation] ────────────────────────────────

describe('AdvancedReveal — collapse option passed only on phone [obligation]', () => {
  test('passes collapse: true to popScrimReveal on phone layout [obligation]', async () => {
    mockIsPhone.value = true
    const { wrapper } = makeWrapper()

    await wrapper.find('[data-testid="advanced-reveal__scrim"]').trigger('click')

    expect(mockPopScrimReveal).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      true,
      { collapse: true }
    )
  })

  test('passes collapse: false to popScrimReveal off phone [obligation]', async () => {
    mockIsPhone.value = false
    const { wrapper } = makeWrapper()

    await wrapper.find('[data-testid="advanced-reveal__scrim"]').trigger('click')

    expect(mockPopScrimReveal).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      true,
      { collapse: false }
    )
  })
})

// ── structure ─────────────────────────────────────────────────────────────────

describe('AdvancedReveal — structure', () => {
  test('renders the badge, scrim and fields testids', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="advanced-reveal__badge"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="advanced-reveal__badge-content"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="advanced-reveal__scrim"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="advanced-reveal__fields"]').exists()).toBe(true)
  })
})

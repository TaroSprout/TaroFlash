import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
// The `?raw` suffix inlines the file as a string at build time.
import advancedRevealSource from '@/views/deck/deck-settings/tab-review-pacing/advanced-reveal.vue?raw'

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

// ── restored state paints at rest, no animation ──────────────────

describe('AdvancedReveal — restored revealed state paints at rest on first render', () => {
  test('a restored revealed=true renders the fields visible on first paint without calling popScrimReveal', () => {
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

// ── toggling flips persistence ───────────────────────────────────

describe('AdvancedReveal — toggling flips persistence', () => {
  test('clicking the scrim persists revealed=true under deck-settings-advanced-revealed', async () => {
    const { wrapper } = makeWrapper()

    await wrapper.find('[data-testid="advanced-reveal__scrim"]').trigger('click')

    expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toBe('true')
  })

  test('clicking the badge after reveal persists revealed=false', async () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, 'true')
    const { wrapper } = makeWrapper()

    await wrapper.find('[data-testid="advanced-reveal__badge"]').trigger('click')

    expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toBe('false')
  })

  test('toggling plays the ui.press sfx', async () => {
    const { wrapper } = makeWrapper()

    await wrapper.find('[data-testid="advanced-reveal__scrim"]').trigger('click')

    expect(mockEmitSfx).toHaveBeenCalledWith('ui.press')
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

// ── collapse passed only on phone ────────────────────────────────

describe('AdvancedReveal — collapse option passed only on phone', () => {
  test('passes collapse: true to popScrimReveal on phone layout', async () => {
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

  test('passes collapse: false to popScrimReveal off phone', async () => {
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

// ── badge reads as a notch into the window ────────────────────────

describe('AdvancedReveal — badge reads as a notch into the window', () => {
  test('badge carries data-station="window"', () => {
    const { wrapper } = makeWrapper()
    const badge = wrapper.find('[data-testid="advanced-reveal__badge"]')
    expect(badge.attributes('data-station')).toBe('window')
  })

  test('badge carries bg-surface and no longer carries bg-well', () => {
    const { wrapper } = makeWrapper()
    const badge = wrapper.find('[data-testid="advanced-reveal__badge"]')
    expect(badge.classes()).toContain('bg-surface')
    expect(badge.classes()).not.toContain('bg-well')
  })

  test('badge classes hold the same shape whether revealed or not', async () => {
    const { wrapper } = makeWrapper()
    const badge = wrapper.find('[data-testid="advanced-reveal__badge"]')
    expect(badge.classes()).toContain('bg-surface')

    await wrapper.find('[data-testid="advanced-reveal__scrim"]').trigger('click')

    expect(badge.classes()).toContain('bg-surface')
    expect(badge.classes()).not.toContain('bg-well')
  })

  test('no raw colour value appears in the component source', () => {
    const rawColourPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|\b(?:bg|text)-\[[^\]]+\]/

    expect(advancedRevealSource).not.toMatch(rawColourPattern)
  })

  test('badge content still renders the eye-close icon, the advanced-label text and text-ink-muted', () => {
    const { wrapper } = makeWrapper()
    const badge = wrapper.find('[data-testid="advanced-reveal__badge"]')
    const content = wrapper.find('[data-testid="advanced-reveal__badge-content"]')

    expect(badge.classes()).toContain('text-ink-muted')
    expect(content.exists()).toBe(true)
    expect(content.find('[data-testid="ui-kit-icon"]').attributes('alt')).toBe('eye-close')
    expect(content.text()).toContain('Advanced')
  })

  test('badge gained no hover, active or group-hover treatment', () => {
    const { wrapper } = makeWrapper()
    const badge = wrapper.find('[data-testid="advanced-reveal__badge"]')

    expect(badge.classes().some((c) => c.startsWith('hover:'))).toBe(false)
    expect(badge.classes().some((c) => c.startsWith('active:'))).toBe(false)
    expect(badge.classes().some((c) => c.startsWith('group-hover:'))).toBe(false)
  })

  test("badge's :class binding still only toggles pointer-events-none on the not-revealed state", async () => {
    const { wrapper } = makeWrapper()
    const badge = wrapper.find('[data-testid="advanced-reveal__badge"]')

    expect(badge.classes()).toContain('pointer-events-none')

    await wrapper.find('[data-testid="advanced-reveal__scrim"]').trigger('click')

    expect(badge.classes()).not.toContain('pointer-events-none')
  })
})

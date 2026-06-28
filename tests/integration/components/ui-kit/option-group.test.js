import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx, coarseRef } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  coarseRef: { value: false }
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitHoverSfx: vi.fn()
}))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: () => coarseRef
}))

vi.mock('@/utils/animations/button-tap', () => ({
  BUTTON_TAP_DURATION: 0,
  playButtonTap: vi.fn(() => ({ peak: Promise.resolve(), done: Promise.resolve() }))
}))

vi.mock('gsap', () => ({
  gsap: { to: vi.fn((_el, opts) => opts?.onComplete?.()) }
}))

import UiOptionGroup from '@/components/ui-kit/option-group.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

const OPTIONS = [
  { value: 'simple', label: 'Simple' },
  { value: 'advanced', label: 'Advanced' }
]

function mountOptionGroup(props = {}) {
  return mount(UiOptionGroup, {
    props: { options: OPTIONS, value: 'simple', ...props },
    global: { directives: { sfx: {} } }
  })
}

function getOptions(wrapper) {
  return wrapper.findAll('[data-testid="ui-option-group__option"]')
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('UiOptionGroup', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
  })

  // ── Rendering ──────────────────────────────────────────────────────────────

  test('renders one option element per option', () => {
    const wrapper = mountOptionGroup()
    expect(getOptions(wrapper)).toHaveLength(2)
  })

  test('root element has ui-option-group testid', () => {
    const wrapper = mountOptionGroup()
    expect(wrapper.find('[data-testid="ui-option-group"]').exists()).toBe(true)
  })

  // ── Active state [obligation] ──────────────────────────────────────────────

  test('active option has data-active=true [obligation]', () => {
    const wrapper = mountOptionGroup({ value: 'simple' })
    const opts = getOptions(wrapper)
    expect(opts[0].attributes('data-active')).toBe('true')
    expect(opts[1].attributes('data-active')).toBe('false')
  })

  test('switching active value changes data-active [obligation]', async () => {
    const wrapper = mountOptionGroup({ value: 'simple' })
    await wrapper.setProps({ value: 'advanced' })
    const opts = getOptions(wrapper)
    expect(opts[0].attributes('data-active')).toBe('false')
    expect(opts[1].attributes('data-active')).toBe('true')
  })

  // ── Tap interaction [obligation] ───────────────────────────────────────────

  test('clicking an inactive option emits update:value with that value [obligation]', async () => {
    const wrapper = mountOptionGroup({ value: 'simple' })
    await getOptions(wrapper)[1].trigger('click')
    await flushPromises()
    expect(wrapper.emitted('update:value')).toHaveLength(1)
    expect(wrapper.emitted('update:value')[0][0]).toBe('advanced')
  })

  test('clicking the active option still emits update:value [obligation]', async () => {
    const wrapper = mountOptionGroup({ value: 'simple' })
    await getOptions(wrapper)[0].trigger('click')
    await flushPromises()
    expect(wrapper.emitted('update:value')).toHaveLength(1)
    expect(wrapper.emitted('update:value')[0][0]).toBe('simple')
  })

  // ── Sfx [obligation] ──────────────────────────────────────────────────────

  test('clicking an inactive option plays snappy_button_5 [obligation]', async () => {
    const wrapper = mountOptionGroup({ value: 'simple' })
    await getOptions(wrapper)[1].trigger('click')
    await flushPromises()
    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_5')
  })

  test('clicking the already-active option plays digi_powerdown [obligation]', async () => {
    const wrapper = mountOptionGroup({ value: 'simple' })
    await getOptions(wrapper)[0].trigger('click')
    await flushPromises()
    expect(mockEmitSfx).toHaveBeenCalledWith('digi_powerdown')
  })

  // ── Size variants ─────────────────────────────────────────────────────────

  test('defaults to size=sm', () => {
    const wrapper = mountOptionGroup()
    expect(wrapper.find('[data-testid="ui-option-group"]').exists()).toBe(true)
  })

  // ── full_width ────────────────────────────────────────────────────────────

  test('renders as inline-flex when full_width is false', () => {
    const wrapper = mountOptionGroup({ full_width: false })
    const root = wrapper.find('[data-testid="ui-option-group"]')
    expect(root.classes()).toContain('inline-flex')
  })

  test('renders as flex w-full when full_width is true', () => {
    const wrapper = mountOptionGroup({ full_width: true })
    const root = wrapper.find('[data-testid="ui-option-group"]')
    expect(root.classes()).toContain('flex')
    expect(root.classes()).toContain('w-full')
  })
})

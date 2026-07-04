import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitHoverSfx: vi.fn()
}))

vi.mock('gsap', () => ({
  gsap: {
    fromTo: vi.fn((_el, _from, to) => to?.onComplete?.()),
    to: vi.fn((_el, opts) => opts?.onComplete?.())
  }
}))

// Real @floating-ui/vue positioning is irrelevant to this component's logic
// and adds real DOM measurement work — stub it flat like popover.test.js does.
vi.mock('@floating-ui/vue', () => ({
  useFloating: vi.fn(() => ({
    placement: { value: 'bottom-start' },
    middlewareData: { value: {} },
    floatingStyles: { value: {} }
  })),
  shift: vi.fn(() => ({})),
  flip: vi.fn(() => ({})),
  autoUpdate: vi.fn(),
  arrow: vi.fn(() => ({})),
  offset: vi.fn(() => ({})),
  hide: vi.fn(() => ({})),
  size: vi.fn(() => ({}))
}))

import DropdownButton from '@/components/ui-kit/dropdown-button/index.vue'

const wrappers = []

function mountDropdown(props = {}, slots = {}) {
  const wrapper = mount(DropdownButton, {
    props: { options: [], ...props },
    slots: { default: 'Label', ...slots },
    attachTo: document.body
  })
  wrappers.push(wrapper)
  return wrapper
}

const primaryButton = (w) => w.find('[data-testid="dropdown-button__button"]')
const caretTrigger = (w) => w.find('[data-testid="dropdown-button__trigger"]')
const popover = (w) => w.find('[data-testid="dropdown-button"]')

describe('DropdownButton', () => {
  beforeEach(() => mockEmitSfx.mockClear())

  afterEach(() => {
    wrappers.forEach((w) => w.unmount())
    wrappers.length = 0
    document.body.innerHTML = ''
  })

  // ── Structure ──────────────────────────────────────────────────────────────

  test('renders the primary button and the caret trigger by default', () => {
    const wrapper = mountDropdown()
    expect(primaryButton(wrapper).exists()).toBe(true)
    expect(caretTrigger(wrapper).exists()).toBe(true)
  })

  test('triggerOnly renders only the trigger button, no label slot content', () => {
    const wrapper = mountDropdown({ triggerOnly: true })
    expect(wrapper.text()).not.toContain('Label')
  })

  // ── disabled prop [obligation] ───────────────────────────────────────────────

  test('disabled=true disables the primary button', () => {
    const wrapper = mountDropdown({ disabled: true })
    expect(primaryButton(wrapper).attributes('aria-disabled')).toBe('true')
  })

  test('disabled=true marks the caret trigger aria-disabled [obligation]', () => {
    const wrapper = mountDropdown({ disabled: true })
    expect(caretTrigger(wrapper).attributes('aria-disabled')).toBe('true')
  })

  test('clicking the caret trigger does not open the popover when disabled=true [obligation]', async () => {
    const wrapper = mountDropdown({ disabled: true })
    await caretTrigger(wrapper).trigger('click')
    expect(popover(wrapper).attributes('data-active')).toBe('false')
  })

  test('Enter keydown on the caret does not open the popover when disabled=true [obligation]', async () => {
    const wrapper = mountDropdown({ disabled: true })
    await caretTrigger(wrapper).trigger('keydown.enter')
    expect(popover(wrapper).attributes('data-active')).toBe('false')
  })

  test('clicking the caret trigger opens the popover when not disabled', async () => {
    const wrapper = mountDropdown()
    await caretTrigger(wrapper).trigger('click')
    expect(popover(wrapper).attributes('data-active')).toBe('true')
  })

  test('primaryDisabled disables only the primary button — the caret stays live', async () => {
    const wrapper = mountDropdown({ primaryDisabled: true })
    expect(primaryButton(wrapper).attributes('aria-disabled')).toBe('true')
    expect(caretTrigger(wrapper).attributes('aria-disabled')).toBeUndefined()

    await caretTrigger(wrapper).trigger('click')
    expect(popover(wrapper).attributes('data-active')).toBe('true')
  })

  // ── menu selection ────────────────────────────────────────────────────────

  test('selecting a menu option emits select with the option and closes the popover', async () => {
    const wrapper = mountDropdown({
      options: [{ value: 'a', label: 'Option A' }]
    })
    await caretTrigger(wrapper).trigger('click')
    expect(popover(wrapper).attributes('data-active')).toBe('true')

    await wrapper.find('[data-testid="dropdown-button__option"]').trigger('click')

    expect(wrapper.emitted('select')).toEqual([[{ value: 'a', label: 'Option A' }]])
    expect(popover(wrapper).attributes('data-active')).toBe('false')
  })

  // ── @close from the popover ──────────────────────────────────────────────

  test('popover close event closes the dropdown', async () => {
    const wrapper = mountDropdown()
    await caretTrigger(wrapper).trigger('click')
    expect(popover(wrapper).attributes('data-active')).toBe('true')

    await wrapper.findComponent({ name: 'Popover' }).vm.$emit('close')
    expect(popover(wrapper).attributes('data-active')).toBe('false')
  })

  // ── openOnTrigger — whole label region opens the popover ────────────────────

  test('clicking the label opens the popover when openOnTrigger=true', async () => {
    const wrapper = mountDropdown({ openOnTrigger: true })
    await primaryButton(wrapper).trigger('click')
    expect(popover(wrapper).attributes('data-active')).toBe('true')
  })

  test('clicking the label does not open the popover when openOnTrigger=false (default)', async () => {
    const wrapper = mountDropdown()
    await primaryButton(wrapper).trigger('click')
    expect(popover(wrapper).attributes('data-active')).toBe('false')
  })

  test('a consumer @click handler still fires when openOnTrigger=true', async () => {
    const onClick = vi.fn()
    const wrapper = mountDropdown({ openOnTrigger: true, onClick })
    await primaryButton(wrapper).trigger('click')
    expect(onClick).toHaveBeenCalledOnce()
  })

  // ── panel slot ────────────────────────────────────────────────────────────

  test('renders the panel slot instead of the options menu when provided', async () => {
    const wrapper = mountDropdown(
      { options: [{ value: 'a', label: 'Option A' }] },
      { panel: '<div data-testid="custom-panel">Custom</div>' }
    )
    await caretTrigger(wrapper).trigger('click')
    expect(wrapper.find('[data-testid="custom-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="dropdown-button__option"]').exists()).toBe(false)
  })
})

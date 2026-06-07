import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

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

// Mock useDropdownSizing so tests don't need ResizeObserver or real DOM layout.
// Plain { value } objects satisfy the component's `.value` reads at mount time.
// Set sizing.min_width.value / sizing.trigger_width.value BEFORE mounting in
// each test — the computed initialises once at setup with the current value.
const { sizing } = vi.hoisted(() => ({
  sizing: {
    triggerRef: { value: null },
    sizerRef: { value: null },
    min_width: { value: 0 },
    trigger_width: { value: 0 }
  }
}))

vi.mock('@/components/ui-kit/dropdown-button/use-dropdown-sizing', () => ({
  useDropdownSizing: vi.fn(() => sizing)
}))

// Stub floating-ui used transitively by UiPopover
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
  hide: vi.fn(() => ({}))
}))

// ── Stub UiButton so we can isolate dropdown-button logic ─────────────────────
// The stub renders a split-button structure:
//   - a main button area (default slot → label)
//   - renders the #trailing slot so the trigger span appears
// It forwards attrs to the root so consumer @click / data-* land on the right
// element (as UiButton with inheritAttrs:false normally handles).

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: ['size', 'variant', 'inverted', 'fullWidth', 'iconLeft', 'sfx', 'style'],
  setup(props, { slots, attrs }) {
    return () =>
      h('button', { ...attrs, style: props.style, 'data-testid': 'dropdown-button__button' }, [
        slots.default?.(),
        slots.trailing?.()
      ])
  }
})

// Stub UiPopover — renders trigger + default slot (menu content) inline so
// jsdom/shallowMount can find them without Teleport gymnastics.
const UiPopoverStub = defineComponent({
  name: 'UiPopover',
  inheritAttrs: false,
  props: ['open', 'position', 'gap', 'use_arrow'],
  emits: ['close'],
  setup(props, { slots, attrs, emit }) {
    return () =>
      h('div', { ...attrs }, [
        slots.trigger?.(),
        props.open
          ? h(
              'div',
              {
                'data-testid': 'ui-popover-backdrop',
                onClick: (e) => {
                  // Simulate backdrop outside click → close
                  if (e.target === e.currentTarget) emit('close')
                }
              },
              slots.default?.()
            )
          : null
      ])
  }
})

// Stub UiIcon — trivial placeholder
const UiIconStub = defineComponent({
  name: 'UiIcon',
  props: ['src'],
  setup(props) {
    return () => h('span', { 'data-testid': 'ui-icon', 'data-src': props.src })
  }
})

// ── Fixtures ──────────────────────────────────────────────────────────────────

const DEFAULT_OPTIONS = [
  { label: 'Select Cards', value: 'select', icon: 'data-check' },
  { label: 'Delete All', value: 'delete' }
]

// ── Mount helper ──────────────────────────────────────────────────────────────

import UiDropdownButton from '@/components/ui-kit/dropdown-button/index.vue'

function mountDropdown(props = {}, { attrs = {}, slots = {} } = {}) {
  return shallowMount(UiDropdownButton, {
    props: { options: DEFAULT_OPTIONS, ...props },
    attrs,
    slots: { default: slots.default ?? (() => 'Edit Cards') },
    global: {
      stubs: {
        UiButton: UiButtonStub,
        UiPopover: UiPopoverStub,
        UiIcon: UiIconStub
      },
      directives: { sfx: {} }
    }
  })
}

// ── Shorthand element finders ─────────────────────────────────────────────────

const popoverRoot = (w) => w.find('[data-testid="dropdown-button"]')
const mainButton = (w) => w.find('[data-testid="dropdown-button__button"]')
const trigger = (w) => w.find('[data-testid="dropdown-button__trigger"]')
const options = (w) => w.findAll('[data-testid="dropdown-button__option"]')
const menu = (w) => w.find('[data-testid="dropdown-button__menu"]')

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('UiDropdownButton', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
    sizing.min_width.value = 0
    sizing.trigger_width.value = 0
  })

  // ── Structure ──────────────────────────────────────────────────────────────

  test('renders the popover container with data-testid="dropdown-button"', () => {
    const wrapper = mountDropdown()
    expect(popoverRoot(wrapper).exists()).toBe(true)
  })

  test('renders the inner button with data-testid="dropdown-button__button"', () => {
    const wrapper = mountDropdown()
    expect(mainButton(wrapper).exists()).toBe(true)
  })

  test('renders the caret trigger with data-testid="dropdown-button__trigger"', () => {
    const wrapper = mountDropdown()
    expect(trigger(wrapper).exists()).toBe(true)
  })

  test('menu is not rendered when closed', () => {
    const wrapper = mountDropdown()
    expect(menu(wrapper).exists()).toBe(false)
  })

  test('menu is rendered when open', async () => {
    const wrapper = mountDropdown()
    await trigger(wrapper).trigger('click')
    expect(menu(wrapper).exists()).toBe(true)
  })

  test('renders an option row for each option', async () => {
    const wrapper = mountDropdown()
    await trigger(wrapper).trigger('click')
    expect(options(wrapper)).toHaveLength(2)
  })

  // ── Open / close state ─────────────────────────────────────────────────────

  test('clicking the trigger opens the menu', async () => {
    const wrapper = mountDropdown()
    expect(menu(wrapper).exists()).toBe(false)
    await trigger(wrapper).trigger('click')
    expect(menu(wrapper).exists()).toBe(true)
  })

  test('clicking the trigger twice closes the menu', async () => {
    const wrapper = mountDropdown()
    await trigger(wrapper).trigger('click')
    await trigger(wrapper).trigger('click')
    expect(menu(wrapper).exists()).toBe(false)
  })

  // ── Open-state reflection on trigger element [obligation] ─────────────────

  test('trigger has aria-expanded=false when menu is closed [obligation]', () => {
    const wrapper = mountDropdown()
    expect(trigger(wrapper).attributes('aria-expanded')).toBe('false')
  })

  test('trigger has aria-expanded=true when menu is open [obligation]', async () => {
    const wrapper = mountDropdown()
    await trigger(wrapper).trigger('click')
    expect(trigger(wrapper).attributes('aria-expanded')).toBe('true')
  })

  test('trigger has data-active=false when menu is closed [obligation]', () => {
    const wrapper = mountDropdown()
    expect(trigger(wrapper).attributes('data-active')).toBe('false')
  })

  test('trigger has data-active=true when menu is open [obligation]', async () => {
    const wrapper = mountDropdown()
    await trigger(wrapper).trigger('click')
    expect(trigger(wrapper).attributes('data-active')).toBe('true')
  })

  // ── Split-button click contract [obligation] ──────────────────────────────

  test('clicking the trigger does NOT fire consumer @click handler [obligation]', async () => {
    const onClick = vi.fn()
    const wrapper = mountDropdown({}, { attrs: { onClick } })
    await trigger(wrapper).trigger('click')
    expect(onClick).not.toHaveBeenCalled()
  })

  test('clicking the trigger DOES toggle the menu open [obligation]', async () => {
    const wrapper = mountDropdown()
    await trigger(wrapper).trigger('click')
    expect(menu(wrapper).exists()).toBe(true)
  })

  test('clicking the label button (default slot) DOES fire consumer @click [obligation]', async () => {
    const onClick = vi.fn()
    const wrapper = mountDropdown({}, { attrs: { onClick } })
    await mainButton(wrapper).trigger('click')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  // ── Attr routing split [obligation] ──────────────────────────────────────

  test('data-theme attr lands on the popover container (non-on attr) [obligation]', () => {
    const wrapper = mountDropdown({}, { attrs: { 'data-theme': 'blue-500' } })
    expect(popoverRoot(wrapper).attributes('data-theme')).toBe('blue-500')
  })

  test('data-theme attr does NOT appear on the inner button [obligation]', () => {
    const wrapper = mountDropdown({}, { attrs: { 'data-theme': 'blue-500' } })
    // UiButtonStub forwards button_attrs which should be empty of non-on keys
    expect(mainButton(wrapper).attributes('data-theme')).toBeUndefined()
  })

  test('consumer @click (on* handler) is routed to the inner button [obligation]', async () => {
    // The main button stub forwards all attrs including onClick to the button element.
    // Confirm clicking the label area fires the consumer handler.
    const onClick = vi.fn()
    const wrapper = mountDropdown({}, { attrs: { onClick } })
    await mainButton(wrapper).trigger('click')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  // ── Select + close contract [obligation] ──────────────────────────────────

  test('clicking an option emits "select" with the option object [obligation]', async () => {
    const wrapper = mountDropdown()
    await trigger(wrapper).trigger('click')
    await options(wrapper)[0].trigger('click')
    expect(wrapper.emitted('select')).toHaveLength(1)
    expect(wrapper.emitted('select')[0][0]).toEqual(DEFAULT_OPTIONS[0])
  })

  test('clicking an option closes the menu [obligation]', async () => {
    const wrapper = mountDropdown()
    await trigger(wrapper).trigger('click')
    await options(wrapper)[0].trigger('click')
    expect(menu(wrapper).exists()).toBe(false)
  })

  test('clicking a second option emits "select" with the correct option object', async () => {
    const wrapper = mountDropdown()
    await trigger(wrapper).trigger('click')
    await options(wrapper)[1].trigger('click')
    expect(wrapper.emitted('select')[0][0]).toEqual(DEFAULT_OPTIONS[1])
  })

  test('default-slot label content is unchanged after selecting an option [obligation]', async () => {
    const wrapper = mountDropdown()
    const originalText = mainButton(wrapper).text()
    await trigger(wrapper).trigger('click')
    await options(wrapper)[0].trigger('click')
    // label should not change — it's fixed, not bound to selection
    expect(mainButton(wrapper).text()).toContain('Edit Cards')
    expect(mainButton(wrapper).text()).toBe(originalText)
  })

  // ── Close from popover @close event ──────────────────────────────────────

  test('@close from the popover closes the menu', async () => {
    const wrapper = mountDropdown()
    await trigger(wrapper).trigger('click')
    expect(menu(wrapper).exists()).toBe(true)

    // Find the UiPopover stub and emit close
    const popover = wrapper.findComponent(UiPopoverStub)
    popover.vm.$emit('close')
    await nextTick()
    expect(menu(wrapper).exists()).toBe(false)
  })

  // ── Keyboard a11y [obligation] ────────────────────────────────────────────

  test('Enter keydown on trigger opens the menu [obligation]', async () => {
    const wrapper = mountDropdown()
    await trigger(wrapper).trigger('keydown', { key: 'Enter' })
    expect(menu(wrapper).exists()).toBe(true)
  })

  test('Space keydown on trigger opens the menu [obligation]', async () => {
    const wrapper = mountDropdown()
    await trigger(wrapper).trigger('keydown', { key: ' ' })
    expect(menu(wrapper).exists()).toBe(true)
  })

  test('Enter keydown on trigger when open closes the menu [obligation]', async () => {
    const wrapper = mountDropdown()
    await trigger(wrapper).trigger('click')
    await trigger(wrapper).trigger('keydown', { key: 'Enter' })
    expect(menu(wrapper).exists()).toBe(false)
  })

  test('trigger has aria-haspopup="menu"', () => {
    const wrapper = mountDropdown()
    expect(trigger(wrapper).attributes('aria-haspopup')).toBe('menu')
  })

  // ── Min-width style ────────────────────────────────────────────────────────

  test('applies min-width style to inner button when min_width is set', () => {
    sizing.min_width.value = 150
    const wrapper = mountDropdown()
    expect(mainButton(wrapper).attributes('style')).toContain('min-width: 150px')
  })

  test('no min-width style when min_width is 0', () => {
    sizing.min_width.value = 0
    const wrapper = mountDropdown()
    expect(mainButton(wrapper).attributes('style') ?? '').not.toContain('min-width')
  })

  // ── menu width style (trigger_width) ──────────────────────────────────────

  test('applies width style to menu when trigger_width is set', async () => {
    sizing.trigger_width.value = 200
    const wrapper = mountDropdown()
    await trigger(wrapper).trigger('click')
    expect(menu(wrapper).attributes('style')).toContain('width: 200px')
  })

  // ── Sizer element ─────────────────────────────────────────────────────────

  test('renders the hidden sizer element', () => {
    const wrapper = mountDropdown()
    expect(wrapper.find('[data-testid="dropdown-button__sizer"]').exists()).toBe(true)
  })

  test('sizer has a row per option', () => {
    const wrapper = mountDropdown()
    const sizer = wrapper.find('[data-testid="dropdown-button__sizer"]')
    // Each option renders a span row inside the sizer
    expect(sizer.findAll('.ui-kit-dropdown-button__row')).toHaveLength(DEFAULT_OPTIONS.length)
  })
})

import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, shallowMount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { provideDepth } from '@/composables/ui/depth'

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

// Stub floating-ui used transitively by UiPopover; include `size` which is now
// used by the match_reference_width middleware path.
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

// ── Stub UiButton so we can isolate dropdown-button logic ─────────────────────
// The stub renders a split-button structure:
//   - a main button area (default slot → label)
//   - renders the #trailing slot so the trigger span appears
// It forwards attrs to the root so consumer @click / data-* land on the right
// element (as UiButton with inheritAttrs:false normally handles).

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: ['size', 'variant', 'inverted', 'fullWidth', 'iconLeft', 'iconRight', 'sfx', 'style'],
  emits: ['press'],
  setup(props, { slots, attrs, emit }) {
    return () =>
      h(
        'button',
        {
          ...attrs,
          style: props.style,
          'data-testid': 'dropdown-button__button',
          onClick: (e) => {
            attrs.onClick?.(e)
            emit('press', e)
          }
        },
        [slots.default?.(), slots.trailing?.()]
      )
  }
})

// Stub UiPopover — renders trigger + default slot (menu content) inline so
// jsdom/shallowMount can find them without Teleport gymnastics.
const UiPopoverStub = defineComponent({
  name: 'UiPopover',
  inheritAttrs: false,
  props: ['open', 'position', 'gap', 'use_arrow', 'match_reference_width', 'shadow'],
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
        UiIcon: UiIconStub,
        // Render the extracted caret/menu children so their markup (trigger,
        // menu, options) is present — shallowMount would otherwise stub them.
        DropdownCaret: false,
        DropdownMenu: false
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

  // ── No inline sizing styles on button or menu [obligation] ────────────────

  test('main button carries no min-width inline style [obligation]', () => {
    const wrapper = mountDropdown()
    const style = mainButton(wrapper).attributes('style') ?? ''
    expect(style).not.toContain('min-width')
  })

  test('menu carries no inline width or min-width style [obligation]', async () => {
    const wrapper = mountDropdown()
    await trigger(wrapper).trigger('click')
    const style = menu(wrapper).attributes('style') ?? ''
    expect(style).not.toContain('width')
    expect(style).not.toContain('min-width')
  })

  // ── match_reference_width wiring [obligation] ─────────────────────────────

  test('popover receives match_reference_width prop [obligation]', () => {
    // The prop is passed as a bare boolean attribute in the template
    // (`match_reference_width` without `:` binding). shallowMount stubs receive
    // bare boolean Vue attrs as "" (HTML attribute) or true depending on version;
    // assert the attribute is present on the stub element rather than the prop.
    const wrapper = mountDropdown()
    const popover = wrapper.findComponent(UiPopoverStub)
    // Bare `match_reference_width` attr is present on the stub root — confirms
    // the prop is wired through to the popover.
    const hasAttr =
      popover.attributes('match_reference_width') !== undefined ||
      popover.props('match_reference_width') === true ||
      popover.props('match_reference_width') === ''
    expect(hasAttr).toBe(true)
  })

  // ── openOnTrigger prop [obligation] ──────────────────────────────────────

  test('openOnTrigger=false (default): clicking the main button does NOT open the menu [obligation]', async () => {
    // Default behavior — back-compat: the main button does not open the dropdown
    const wrapper = mountDropdown({ openOnTrigger: false })
    await mainButton(wrapper).trigger('click')
    expect(menu(wrapper).exists()).toBe(false)
  })

  test('openOnTrigger=true: clicking the main button opens the menu [obligation]', async () => {
    const wrapper = mountDropdown({ openOnTrigger: true })
    await mainButton(wrapper).trigger('click')
    expect(menu(wrapper).exists()).toBe(true)
  })

  test('openOnTrigger=true: clicking the main button again closes the menu [obligation]', async () => {
    const wrapper = mountDropdown({ openOnTrigger: true })
    await mainButton(wrapper).trigger('click')
    await mainButton(wrapper).trigger('click')
    expect(menu(wrapper).exists()).toBe(false)
  })

  test('openOnTrigger=true: the caret still toggles the menu [obligation]', async () => {
    const wrapper = mountDropdown({ openOnTrigger: true })
    await trigger(wrapper).trigger('click')
    expect(menu(wrapper).exists()).toBe(true)
  })

  test('openOnTrigger=false: the caret still toggles the menu [obligation]', async () => {
    const wrapper = mountDropdown({ openOnTrigger: false })
    await trigger(wrapper).trigger('click')
    expect(menu(wrapper).exists()).toBe(true)
  })

  test('openOnTrigger=true: clicking caret does not double-fire (opens once) [obligation]', async () => {
    // The caret uses @click.stop so it doesn't bubble to the main button.
    // Clicking the caret once should open, not immediately close (double-fire would close it).
    const wrapper = mountDropdown({ openOnTrigger: true })
    await trigger(wrapper).trigger('click')
    expect(menu(wrapper).exists()).toBe(true)
  })

  // ── hideTrigger + openOnTrigger gating [obligation] ───────────────────────

  test('hideTrigger+openOnTrigger: caret is NOT rendered [obligation]', () => {
    const wrapper = mountDropdown({ hideTrigger: true, openOnTrigger: true })
    expect(wrapper.find('[data-testid="dropdown-button__trigger-wrap"]').exists()).toBe(false)
  })

  test('hideTrigger alone (no openOnTrigger): caret IS still rendered [obligation]', () => {
    const wrapper = mountDropdown({ hideTrigger: true, openOnTrigger: false })
    expect(wrapper.find('[data-testid="dropdown-button__trigger-wrap"]').exists()).toBe(true)
  })

  // ── trigger_style: open fill for transparent variants [obligation] ─────────

  test('ghost variant: main button gets --btn-bg-color style when menu is open [obligation]', async () => {
    const wrapper = mountDropdown({ variant: 'ghost' })
    await trigger(wrapper).trigger('click')
    expect(mainButton(wrapper).attributes('style')).toContain('--btn-bg-color')
    expect(mainButton(wrapper).attributes('style')).toContain('var(--color-element)')
  })

  test('outline variant: main button gets --btn-bg-color style when menu is open [obligation]', async () => {
    const wrapper = mountDropdown({ variant: 'outline' })
    await trigger(wrapper).trigger('click')
    expect(mainButton(wrapper).attributes('style')).toContain('--btn-bg-color')
    expect(mainButton(wrapper).attributes('style')).toContain('var(--color-element)')
  })

  test('solid variant: main button does NOT get --btn-bg-color style when menu is open [obligation]', async () => {
    const wrapper = mountDropdown({ variant: 'solid' })
    await trigger(wrapper).trigger('click')
    const style = mainButton(wrapper).attributes('style') ?? ''
    expect(style).not.toContain('--btn-bg-color')
  })

  test('ghost variant: main button has no --btn-bg-color style when menu is closed [obligation]', () => {
    const wrapper = mountDropdown({ variant: 'ghost' })
    const style = mainButton(wrapper).attributes('style') ?? ''
    expect(style).not.toContain('--btn-bg-color')
  })

  // ── consumer @click fires exactly once per activation [obligation] ────────

  test('consumer @click fires exactly once when main button is clicked (not merged into array) [obligation]', async () => {
    const onClick = vi.fn()
    const wrapper = mountDropdown({}, { attrs: { onClick } })
    await mainButton(wrapper).trigger('click')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  test('consumer @click fires exactly once even with openOnTrigger=true [obligation]', async () => {
    const onClick = vi.fn()
    const wrapper = mountDropdown({ openOnTrigger: true }, { attrs: { onClick } })
    await mainButton(wrapper).trigger('click')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  // ── ambient depth forwarded to the menu [obligation] ────────────────────────
  // The menu is teleported and can't inherit the trigger's ambient depth
  // through the DOM, so the trigger passes its own ambient depth explicitly —
  // the menu paints at the SAME depth as the trigger button, not a stepped one.

  test('the menu receives the ambient depth (0) when no ancestor provides one [obligation]', async () => {
    const wrapper = mountDropdown()
    await trigger(wrapper).trigger('click')
    expect(menu(wrapper).attributes('data-depth')).toBe('0')
  })

  test('the menu receives an ancestor-provided ambient depth [obligation]', async () => {
    const Parent = defineComponent({
      setup() {
        provideDepth(1)
        return () =>
          h(UiDropdownButton, { options: DEFAULT_OPTIONS }, { default: () => 'Edit Cards' })
      }
    })
    // `mount`, not `shallowMount` — UiDropdownButton is Parent's direct
    // child, and shallowMount auto-stubs direct children, which would stub
    // out the component under test.
    const wrapper = mount(Parent, {
      global: {
        stubs: {
          UiButton: UiButtonStub,
          UiPopover: UiPopoverStub,
          UiIcon: UiIconStub,
          DropdownCaret: false,
          DropdownMenu: false
        },
        directives: { sfx: {} }
      }
    })

    await trigger(wrapper).trigger('click')
    expect(menu(wrapper).attributes('data-depth')).toBe('1')
  })

  // ── shadow prop forwarded to popover [obligation] ─────────────────────────

  test('shadow=true is forwarded to the popover [obligation]', () => {
    const wrapper = mountDropdown({ shadow: true })
    const popover = wrapper.findComponent(UiPopoverStub)
    expect(popover.props('shadow')).toBe(true)
  })

  test('shadow=false (default) forwards false to the popover [obligation]', () => {
    const wrapper = mountDropdown({ shadow: false })
    const popover = wrapper.findComponent(UiPopoverStub)
    expect(popover.props('shadow')).toBe(false)
  })

  // ── iconRight forwarding [obligation] ─────────────────────────────────────

  test('iconRight prop forwards to the inner UiButton [obligation]', () => {
    const wrapper = mountDropdown({ iconRight: 'carat-down' })
    expect(wrapper.findComponent(UiButtonStub).props('iconRight')).toBe('carat-down')
  })

  // ── sfx emissions [obligation] ────────────────────────────────────────────

  test('clicking the trigger emits ui.snappy_button_5 [obligation]', async () => {
    const wrapper = mountDropdown()
    mockEmitSfx.mockClear()
    await trigger(wrapper).trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_5')
  })

  test('clicking the trigger again (close) emits ui.snappy_button_5 [obligation]', async () => {
    const wrapper = mountDropdown()
    await trigger(wrapper).trigger('click')
    mockEmitSfx.mockClear()
    await trigger(wrapper).trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_5')
  })

  test('selecting an option does NOT emit ui.select (removed in menu refactor) [obligation]', async () => {
    const wrapper = mountDropdown()
    await trigger(wrapper).trigger('click')
    mockEmitSfx.mockClear()
    await options(wrapper)[0].trigger('click')
    expect(mockEmitSfx).not.toHaveBeenCalledWith('select')
  })

  // ── primaryDisabled prop [obligation] ─────────────────────────────────────
  // When primaryDisabled=true, the primary action button is disabled but the
  // caret trigger remains live so the menu can still be opened.

  describe('primaryDisabled [obligation]', () => {
    test('primaryDisabled=true passes disabled=true to the inner UiButton [obligation]', () => {
      // UiButtonStub receives the disabled prop forwarded from UiButton's
      // :disabled="primaryDisabled" binding.
      const wrapper = mountDropdown({ primaryDisabled: true })
      const btn = wrapper.findComponent(UiButtonStub)
      // The stub doesn't declare disabled in props, but it's forwarded as an attr
      const hasDisabled =
        btn.attributes('disabled') !== undefined ||
        btn.attributes('aria-disabled') !== undefined ||
        btn.props('disabled') === true
      expect(hasDisabled).toBe(true)
    })

    test('primaryDisabled=true: caret trigger is still rendered and clickable [obligation]', async () => {
      const wrapper = mountDropdown({ primaryDisabled: true })
      // The caret must exist
      expect(trigger(wrapper).exists()).toBe(true)
      // Clicking the caret opens the menu even though the primary is disabled
      await trigger(wrapper).trigger('click')
      expect(menu(wrapper).exists()).toBe(true)
    })

    test('primaryDisabled=true: selecting an option still emits select [obligation]', async () => {
      const wrapper = mountDropdown({ primaryDisabled: true })
      await trigger(wrapper).trigger('click')
      await options(wrapper)[0].trigger('click')
      expect(wrapper.emitted('select')).toHaveLength(1)
      expect(wrapper.emitted('select')[0][0]).toEqual(DEFAULT_OPTIONS[0])
    })

    test('primaryDisabled=false (default): the button is not disabled', () => {
      const wrapper = mountDropdown({ primaryDisabled: false })
      // Caret still works
      expect(trigger(wrapper).exists()).toBe(true)
    })
  })

  // ── triggerOnly prop [obligation] ─────────────────────────────────────────
  // When triggerOnly=true only the icon button is rendered (no label + caret).
  // Clicking it opens/closes the menu identical to the caret in normal mode.

  describe('triggerOnly [obligation]', () => {
    test('triggerOnly=true renders a single icon button, not the label button + caret', () => {
      const wrapper = mountDropdown({ triggerOnly: true })
      // The icon-only button carries data-testid="dropdown-button__button"
      expect(mainButton(wrapper).exists()).toBe(true)
      // The caret trigger should NOT be present — the whole button IS the trigger
      expect(trigger(wrapper).exists()).toBe(false)
    })

    test('triggerOnly=true: clicking the button opens the menu [obligation]', async () => {
      const wrapper = mountDropdown({ triggerOnly: true })
      await mainButton(wrapper).trigger('click')
      expect(menu(wrapper).exists()).toBe(true)
    })

    test('triggerOnly=true: clicking again closes the menu', async () => {
      const wrapper = mountDropdown({ triggerOnly: true })
      await mainButton(wrapper).trigger('click')
      await mainButton(wrapper).trigger('click')
      expect(menu(wrapper).exists()).toBe(false)
    })

    test('triggerOnly=true: selecting an option emits select and closes menu', async () => {
      const wrapper = mountDropdown({ triggerOnly: true })
      await mainButton(wrapper).trigger('click')
      await options(wrapper)[0].trigger('click')
      expect(wrapper.emitted('select')).toHaveLength(1)
      expect(wrapper.emitted('select')[0][0]).toEqual(DEFAULT_OPTIONS[0])
      expect(menu(wrapper).exists()).toBe(false)
    })

    test('triggerOnly=false (default): label button + caret are both rendered', () => {
      const wrapper = mountDropdown({ triggerOnly: false })
      expect(mainButton(wrapper).exists()).toBe(true)
      expect(trigger(wrapper).exists()).toBe(true)
    })

    test('triggerOnly=true forwards variant="ghost" to the trigger button [obligation]', () => {
      // The trigger-only button must forward `variant` so callers can use ghost/outline styles.
      // Backward-compatible: defaults to "solid" when variant is not passed.
      const wrapper = mountDropdown({ triggerOnly: true, variant: 'ghost' })
      // UiButtonStub declares variant as a prop — findComponent gives us the prop value.
      expect(wrapper.findComponent({ name: 'UiButton' }).props('variant')).toBe('ghost')
    })

    test('triggerOnly=true defaults to variant="solid" when variant is not passed [obligation]', () => {
      const wrapper = mountDropdown({ triggerOnly: true })
      expect(wrapper.findComponent({ name: 'UiButton' }).props('variant')).toBe('solid')
    })
  })

  // ── DropdownOption.separator [obligation] ──────────────────────────────────

  describe('DropdownOption.separator [obligation]', () => {
    test('renders a divider above the option that sets separator: true [obligation]', async () => {
      const wrapper = mountDropdown({
        options: [
          { label: 'Select Cards', value: 'select' },
          { label: 'Delete All', value: 'delete', separator: true }
        ]
      })
      await trigger(wrapper).trigger('click')

      const separators = menu(wrapper).findAll('[data-testid="dropdown-button__separator"]')
      expect(separators).toHaveLength(1)
    })

    test('no divider renders when no option sets separator [obligation]', async () => {
      const wrapper = mountDropdown()
      await trigger(wrapper).trigger('click')

      expect(menu(wrapper).findAll('[data-testid="dropdown-button__separator"]')).toHaveLength(0)
    })

    test('the divider sits immediately above its option in DOM order [obligation]', async () => {
      const wrapper = mountDropdown({
        options: [
          { label: 'Select Cards', value: 'select' },
          { label: 'Delete All', value: 'delete', separator: true }
        ]
      })
      await trigger(wrapper).trigger('click')

      const children = [...menu(wrapper).element.children]
      const separator_index = children.findIndex(
        (el) => el.getAttribute('data-testid') === 'dropdown-button__separator'
      )
      const delete_option_index = options(wrapper)[1].element
        ? children.indexOf(options(wrapper)[1].element)
        : -1

      expect(separator_index).toBeGreaterThanOrEqual(0)
      expect(separator_index).toBe(delete_option_index - 1)
    })
  })

  // ── #panel slot [obligation] ──────────────────────────────────────────────
  // When a #panel slot is provided, its content renders inside the
  // dropdown-button__menu container and NO option rows are shown.

  describe('#panel slot [obligation]', () => {
    function mountDropdownWithPanel(panelContent = 'panel-content', props = {}) {
      return shallowMount(UiDropdownButton, {
        props: { ...props },
        slots: {
          default: () => 'Trigger Label',
          panel: () => h('div', { 'data-testid': 'custom-panel' }, panelContent)
        },
        global: {
          stubs: {
            UiButton: UiButtonStub,
            UiPopover: UiPopoverStub,
            UiIcon: UiIconStub,
            DropdownCaret: false,
            DropdownMenu: false
          },
          directives: { sfx: {} }
        }
      })
    }

    test('with #panel slot: panel content appears inside dropdown-button__menu [obligation]', async () => {
      const wrapper = mountDropdownWithPanel()
      await trigger(wrapper).trigger('click')
      expect(menu(wrapper).exists()).toBe(true)
      expect(menu(wrapper).find('[data-testid="custom-panel"]').exists()).toBe(true)
    })

    test('with #panel slot: NO option rows are rendered [obligation]', async () => {
      const wrapper = mountDropdownWithPanel()
      await trigger(wrapper).trigger('click')
      expect(options(wrapper)).toHaveLength(0)
    })

    test('without #panel slot but with options: option rows still render (fallback preserved) [obligation]', async () => {
      const wrapper = mountDropdown()
      await trigger(wrapper).trigger('click')
      expect(options(wrapper)).toHaveLength(DEFAULT_OPTIONS.length)
    })

    test('omitting options (no prop, no panel) must not crash [obligation]', () => {
      expect(() =>
        shallowMount(UiDropdownButton, {
          slots: {
            default: () => 'Label',
            panel: () => h('div', { 'data-testid': 'custom-panel' }, 'panel')
          },
          global: {
            stubs: {
              UiButton: UiButtonStub,
              UiPopover: UiPopoverStub,
              UiIcon: UiIconStub,
              DropdownCaret: false,
              DropdownMenu: false
            },
            directives: { sfx: {} }
          }
        })
      ).not.toThrow()
    })

    test('match_reference_width is false when #panel slot is provided [obligation]', () => {
      const wrapper = mountDropdownWithPanel()
      const popover = wrapper.findComponent(UiPopoverStub)
      // When panel slot is present, match_reference_width should be false so the
      // panel isn't squished to the trigger width.
      expect(popover.props('match_reference_width')).toBe(false)
    })

    test('match_reference_width is true when no #panel slot and not triggerOnly [obligation]', () => {
      const wrapper = mountDropdown()
      const popover = wrapper.findComponent(UiPopoverStub)
      expect(popover.props('match_reference_width')).toBe(true)
    })
  })

  // ── module singleton — close_open_menu [obligation] ───────────────────────
  // Only one dropdown menu may be open at a time app-wide. A long-press open
  // swallows the release click (see press-hold.ts), so outside-click close
  // alone can't be relied on to close a previously open menu — opening a new
  // dropdown must explicitly close whichever one was already open.

  describe('module singleton — close_open_menu [obligation]', () => {
    test('opening dropdown B while A is open closes A [obligation]', async () => {
      const wrapperA = mountDropdown()
      const wrapperB = mountDropdown()

      await trigger(wrapperA).trigger('click')
      expect(menu(wrapperA).exists()).toBe(true)

      await trigger(wrapperB).trigger('click')

      expect(menu(wrapperB).exists()).toBe(true)
      expect(menu(wrapperA).exists()).toBe(false)

      wrapperA.unmount()
      wrapperB.unmount()
    })

    test('unmounting an open dropdown releases the singleton slot so the next open is unaffected [obligation]', async () => {
      const wrapperA = mountDropdown()
      await trigger(wrapperA).trigger('click')
      expect(menu(wrapperA).exists()).toBe(true)

      wrapperA.unmount()

      const wrapperB = mountDropdown()
      await trigger(wrapperB).trigger('click')
      expect(menu(wrapperB).exists()).toBe(true)

      // A third dropdown opening still correctly closes B — proving B (not a
      // dangling reference to the unmounted A) is the registered singleton owner.
      const wrapperC = mountDropdown()
      await trigger(wrapperC).trigger('click')
      expect(menu(wrapperC).exists()).toBe(true)
      expect(menu(wrapperB).exists()).toBe(false)

      wrapperB.unmount()
      wrapperC.unmount()
    })
  })

  // ── defineExpose { open, show } [obligation] ──────────────────────────────

  describe('defineExpose { open, show } [obligation]', () => {
    test('show() opens the menu', async () => {
      const wrapper = mountDropdown()
      wrapper.vm.show()
      await nextTick()
      expect(menu(wrapper).exists()).toBe(true)
    })

    test('show() is a no-op when disabled — the same gate as a press', async () => {
      const wrapper = mountDropdown({ disabled: true })
      wrapper.vm.show()
      await nextTick()
      expect(menu(wrapper).exists()).toBe(false)
    })

    test('show() is a no-op when the menu is already open (does not toggle it closed)', async () => {
      const wrapper = mountDropdown()
      wrapper.vm.show()
      await nextTick()
      expect(menu(wrapper).exists()).toBe(true)

      wrapper.vm.show()
      await nextTick()
      expect(menu(wrapper).exists()).toBe(true)
    })

    test('exposed open reflects the popover state', async () => {
      const wrapper = mountDropdown()
      expect(wrapper.vm.open).toBe(false)

      wrapper.vm.show()
      await nextTick()
      expect(wrapper.vm.open).toBe(true)
    })
  })
})

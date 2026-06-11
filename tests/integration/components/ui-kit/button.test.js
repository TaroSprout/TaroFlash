import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'

const { coarseRef, mockEmitSfx } = vi.hoisted(() => ({
  coarseRef: { value: true },
  mockEmitSfx: vi.fn()
}))

vi.mock('@/composables/use-media-query', () => ({
  useMatchMedia: () => coarseRef
}))

vi.mock('gsap', () => ({
  gsap: { to: vi.fn((_el, opts) => opts?.onComplete?.()) }
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitHoverSfx: vi.fn()
}))

import UiButton from '@/components/ui-kit/button.vue'
import UiTooltip from '@/components/ui-kit/tooltip.vue'

// A UiTooltip stub that forwards attrs and renders slot content so inner
// data-testid elements (ui-kit-button__content, ui-kit-button__trailing) are
// accessible in tests that assert on button structure.
const UiTooltipSlotStub = defineComponent({
  name: 'UiTooltip',
  inheritAttrs: false,
  props: ['element', 'gap', 'suppress', 'static_on_mobile', 'text'],
  setup(_props, { slots, attrs }) {
    return () => h('button', { ...attrs, 'data-testid': 'ui-kit-button' }, slots.default?.())
  }
})

function mountButton(props = {}, slots = {}) {
  return shallowMount(UiButton, { props, slots })
}

// Variant used for trailing-slot structure tests — uses a slot-rendering stub
// so inner data-testid elements are reachable.
function mountButtonWithSlots(props = {}, slots = {}) {
  return shallowMount(UiButton, {
    props,
    slots,
    global: { stubs: { UiTooltip: UiTooltipSlotStub }, directives: { sfx: {} } }
  })
}

function findTooltip(wrapper) {
  return wrapper.findComponent(UiTooltip)
}

describe('UiButton', () => {
  // ── tooltip wiring ─────────────────────────────────────────────────────────

  describe('tooltip', () => {
    test('tooltip enabled when iconOnly=true and slot content exists', () => {
      const wrapper = mountButton({ iconOnly: true }, { default: 'Close' })
      expect(findTooltip(wrapper).props('suppress')).toBe(false)
    })

    test('tooltip suppressed when iconOnly=false', () => {
      const wrapper = mountButton({ iconOnly: false }, { default: 'Label' })
      expect(findTooltip(wrapper).props('suppress')).toBe(true)
    })

    test('tooltip suppressed when there is no slot content', () => {
      const wrapper = mountButton({ iconOnly: true })
      expect(findTooltip(wrapper).props('suppress')).toBe(true)
    })

    test('mobileTooltip=true forwards static_on_mobile=true (tap-shows on mobile)', () => {
      const wrapper = mountButton({ iconOnly: true, mobileTooltip: true }, { default: 'Close' })
      expect(findTooltip(wrapper).props('static_on_mobile')).toBe(true)
    })

    test('mobileTooltip=false forwards static_on_mobile=false (hover-only)', () => {
      const wrapper = mountButton({ iconOnly: true, mobileTooltip: false }, { default: 'Close' })
      expect(findTooltip(wrapper).props('static_on_mobile')).toBe(false)
    })

    test('renders tooltip via element=button (button is the trigger)', () => {
      const wrapper = mountButton({ iconOnly: true }, { default: 'Close' })
      expect(findTooltip(wrapper).props('element')).toBe('button')
    })
  })

  // ── data-testid ────────────────────────────────────────────────────────────

  test('renders the button element', () => {
    const wrapper = mountButton()
    expect(wrapper.find('[data-testid="ui-kit-button"]').exists()).toBe(true)
  })

  // ── data-theme forwarding ──────────────────────────────────────────────────

  test('forwards data-theme attribute to the root element', () => {
    const wrapper = shallowMount(UiButton, { attrs: { 'data-theme': 'green-400' } })
    expect(wrapper.find('[data-testid="ui-kit-button"]').attributes('data-theme')).toBe('green-400')
  })

  test('forwards data-theme-dark attribute to the root element', () => {
    const wrapper = shallowMount(UiButton, {
      attrs: { 'data-theme': 'green-400', 'data-theme-dark': 'grey-900' }
    })
    expect(wrapper.find('[data-testid="ui-kit-button"]').attributes('data-theme-dark')).toBe(
      'grey-900'
    )
  })

  // ── playOnTap ──────────────────────────────────────────────────────────────

  describe('playOnTap', () => {
    beforeEach(() => {
      coarseRef.value = true
      mockEmitSfx.mockClear()
    })

    test('defers the click handler until after the tap animation on coarse pointers', async () => {
      const onClick = vi.fn()
      const wrapper = shallowMount(UiButton, {
        props: { playOnTap: true },
        attrs: { onClick }
      })

      await wrapper.find('[data-testid="ui-kit-button"]').trigger('click')

      expect(onClick).toHaveBeenCalledTimes(1)
    })

    test('toggles data-playing while the tap is in flight', async () => {
      let resolveTween
      const { gsap } = await import('gsap')
      gsap.to.mockImplementationOnce(
        (_el, opts) =>
          new Promise((resolve) => {
            resolveTween = () => {
              opts.onComplete()
              resolve()
            }
          })
      )

      const onClick = vi.fn()
      const wrapper = shallowMount(UiButton, {
        props: { playOnTap: true },
        attrs: { onClick }
      })

      await wrapper.find('[data-testid="ui-kit-button"]').trigger('click')

      expect(wrapper.find('[data-testid="ui-kit-button"]').attributes('data-playing')).toBe('true')

      resolveTween()
    })

    test('does not intercept on pointer:fine — handler fires natively', async () => {
      coarseRef.value = false
      const onClick = vi.fn()
      const wrapper = shallowMount(UiButton, {
        props: { playOnTap: true },
        attrs: { onClick }
      })

      await wrapper.find('[data-testid="ui-kit-button"]').trigger('click')

      expect(onClick).toHaveBeenCalledTimes(1)
    })

    test('does not intercept when playOnTap is false', async () => {
      const onClick = vi.fn()
      const wrapper = shallowMount(UiButton, {
        props: { playOnTap: false },
        attrs: { onClick }
      })

      const { gsap } = await import('gsap')
      gsap.to.mockClear()
      await wrapper.find('[data-testid="ui-kit-button"]').trigger('click')

      expect(gsap.to).not.toHaveBeenCalled()
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    test('emits click sfx at the start of the tap when sfx.click is set', async () => {
      const wrapper = shallowMount(UiButton, {
        props: { playOnTap: true, sfx: { click: 'ui.select' } },
        attrs: { onClick: vi.fn() }
      })

      await wrapper.find('[data-testid="ui-kit-button"]').trigger('click')

      expect(mockEmitSfx).toHaveBeenCalledWith('ui.select', expect.any(Object))
    })

    test('omits sfx when sfx.click is not set', async () => {
      const wrapper = shallowMount(UiButton, {
        props: { playOnTap: true },
        attrs: { onClick: vi.fn() }
      })

      await wrapper.find('[data-testid="ui-kit-button"]').trigger('click')

      expect(mockEmitSfx).not.toHaveBeenCalled()
    })
  })

  // ── ghost variant — fancyHover overlay suppression [obligation] ───────────

  describe('ghost variant', () => {
    test('ghost button: fancyHover overlay does NOT get the group-hover/btn:block class [obligation]', () => {
      // The diagonal-stripe overlay is gated by `variant !== 'ghost'`.
      // Use mountButtonWithSlots to get actual rendered DOM (UiTooltipSlotStub
      // renders slot content so the inner divs are accessible).
      const wrapper = mountButtonWithSlots(
        { variant: 'ghost', fancyHover: true },
        { default: 'Label' }
      )

      // Find the stripe overlay div — it's the absolutely-positioned one inside
      // the button content area. We assert via data-testid on the button root
      // and query its children, not by class names.
      const button = wrapper.find('[data-testid="ui-kit-button"]')
      expect(button.exists()).toBe(true)

      // The overlay is present in the DOM but must NOT carry the
      // group-hover/btn:block class when variant=ghost (the class gating).
      // We assert at the source level: find the absolute inset div and confirm
      // its outerHTML does NOT contain `group-hover/btn:block` and `group-data-[playing=true]/btn:block`.
      const html = button.html()
      // The hover-stripe classes are only present when !loading && fancyHover && variant !== 'ghost'
      expect(html).not.toContain('group-hover/btn:block')
    })

    test('non-ghost variant with fancyHover: overlay gets the group-hover/btn:block class [obligation]', () => {
      const wrapper = mountButtonWithSlots(
        { variant: 'solid', fancyHover: true },
        { default: 'Label' }
      )

      const button = wrapper.find('[data-testid="ui-kit-button"]')
      expect(button.html()).toContain('group-hover/btn:block')
    })
  })

  // ── trailing slot / split layout [obligation] ──────────────────────────────
  // Uses mountButtonWithSlots — a UiTooltip stub that renders slot content so
  // inner data-testid elements (ui-kit-button__content, ui-kit-button__trailing)
  // are reachable in the wrapper tree.

  describe('trailing slot', () => {
    test('renders ui-kit-button__content when no #trailing slot is provided', () => {
      const wrapper = mountButtonWithSlots({}, { default: 'Label' })
      expect(wrapper.find('[data-testid="ui-kit-button__content"]').exists()).toBe(true)
    })

    test('does NOT render ui-kit-button__trailing when no #trailing slot is provided [obligation]', () => {
      const wrapper = mountButtonWithSlots({}, { default: 'Label' })
      expect(wrapper.find('[data-testid="ui-kit-button__trailing"]').exists()).toBe(false)
    })

    test('renders ui-kit-button__trailing when a #trailing slot is provided [obligation]', () => {
      const wrapper = mountButtonWithSlots({}, { trailing: () => h('span', 'caret') })
      expect(wrapper.find('[data-testid="ui-kit-button__trailing"]').exists()).toBe(true)
    })

    test('renders ui-kit-button__content alongside the trailing slot [obligation]', () => {
      const wrapper = mountButtonWithSlots(
        {},
        { default: 'Label', trailing: () => h('span', 'caret') }
      )
      expect(wrapper.find('[data-testid="ui-kit-button__content"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="ui-kit-button__trailing"]').exists()).toBe(true)
    })

    test('trailing slot content is rendered inside ui-kit-button__trailing', () => {
      const wrapper = mountButtonWithSlots(
        {},
        { trailing: () => h('span', { 'data-testid': 'caret' }, '▼') }
      )
      const trailing = wrapper.find('[data-testid="ui-kit-button__trailing"]')
      expect(trailing.find('[data-testid="caret"]').exists()).toBe(true)
    })
  })
})

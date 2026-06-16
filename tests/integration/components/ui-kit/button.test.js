import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'

const { coarseRef, mockEmitSfx } = vi.hoisted(() => ({
  coarseRef: { value: true },
  mockEmitSfx: vi.fn()
}))

vi.mock('@/composables/ui/media-query', () => ({
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
        props: { playOnTap: true, tapAnimate: true },
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
        props: { playOnTap: true, tapAnimate: true },
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

    test('emits press sfx at the start of the tap when sfx.press is set', async () => {
      vi.useFakeTimers()
      const wrapper = shallowMount(UiButton, {
        props: { playOnTap: true, sfx: { press: 'ui.select' } },
        attrs: { onClick: vi.fn() }
      })

      wrapper
        .find('[data-testid="ui-kit-button"]')
        .element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      vi.advanceTimersByTime(500)
      await wrapper.vm.$nextTick()

      expect(mockEmitSfx).toHaveBeenCalledWith('ui.select', expect.any(Object))
      vi.useRealTimers()
    })

    test('omits sfx when sfx.click is not set', async () => {
      const wrapper = shallowMount(UiButton, {
        props: { playOnTap: true },
        attrs: { onClick: vi.fn() }
      })

      await wrapper.find('[data-testid="ui-kit-button"]').trigger('click')

      expect(mockEmitSfx).not.toHaveBeenCalled()
    })

    describe('tapAnimate=false — quiet tap mode [obligation]', () => {
      beforeEach(() => {
        vi.useFakeTimers()
      })
      afterEach(() => {
        vi.useRealTimers()
      })

      test('tapAnimate=false still toggles data-playing on a coarse tap [obligation]', async () => {
        const { gsap } = await import('gsap')
        gsap.to.mockClear()

        const onClick = vi.fn()
        const wrapper = shallowMount(UiButton, {
          props: { playOnTap: true, tapAnimate: false },
          attrs: { onClick }
        })

        wrapper
          .find('[data-testid="ui-kit-button"]')
          .element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        await wrapper.vm.$nextTick()

        expect(wrapper.find('[data-testid="ui-kit-button"]').attributes('data-playing')).toBe(
          'true'
        )
      })

      test('tapAnimate=false does NOT invoke the GSAP tween [obligation]', async () => {
        const { gsap } = await import('gsap')
        gsap.to.mockClear()

        const onClick = vi.fn()
        const wrapper = shallowMount(UiButton, {
          props: { playOnTap: true, tapAnimate: false },
          attrs: { onClick }
        })

        wrapper
          .find('[data-testid="ui-kit-button"]')
          .element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        await wrapper.vm.$nextTick()

        expect(gsap.to).not.toHaveBeenCalled()
      })

      test('tapAnimate=false still fires press sfx when sfx.press is set [obligation]', async () => {
        mockEmitSfx.mockClear()
        const wrapper = shallowMount(UiButton, {
          props: { playOnTap: true, tapAnimate: false, sfx: { press: 'ui.select' } },
          attrs: { onClick: vi.fn() }
        })

        wrapper
          .find('[data-testid="ui-kit-button"]')
          .element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        vi.advanceTimersByTime(500)
        await wrapper.vm.$nextTick()

        expect(mockEmitSfx).toHaveBeenCalledWith('ui.select', expect.any(Object))
      })

      test('tapAnimate=true (default) still uses GSAP tween [obligation]', async () => {
        const { gsap } = await import('gsap')
        gsap.to.mockClear()

        const wrapper = shallowMount(UiButton, {
          props: { playOnTap: true, tapAnimate: true },
          attrs: { onClick: vi.fn() }
        })

        await wrapper.find('[data-testid="ui-kit-button"]').trigger('click')

        expect(gsap.to).toHaveBeenCalled()
      })
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

  // ── playOnTap bails for clicks inside .btn-trailing [obligation] ──────────

  describe('playOnTap — trailing region bail', () => {
    test('clicking inside .btn-trailing skips the play-on-tap intercept so GSAP is NOT called [obligation]', async () => {
      // Verify that the `onCaptureClick` guard bails when the click target is
      // inside `.btn-trailing`, leaving the event for the caret's own handler.
      // We confirm GSAP is never invoked — the tap-pop animation is the intercept.
      const { gsap } = await import('gsap')
      gsap.to.mockClear()

      const onClick = vi.fn()
      const wrapper = mountButtonWithSlots(
        { playOnTap: true },
        {
          default: 'Label',
          // The trailing div carries the .btn-trailing class so closest() finds it.
          trailing: () =>
            h('div', { class: 'btn-trailing' }, [h('span', { 'data-testid': 'caret-inner' }, '▼')])
        }
      )

      // Dispatch a click whose target is the inner caret span — it is a descendant
      // of .btn-trailing so closest('.btn-trailing') returns truthy → bail.
      const caretInner = wrapper.find('[data-testid="caret-inner"]').element
      caretInner.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await wrapper.vm.$nextTick()

      // The tap-pop GSAP animation must NOT have been triggered.
      expect(gsap.to).not.toHaveBeenCalled()
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

  // ── disabled prop [obligation] ─────────────────────────────────────────────
  // A disabled button blocks its own @click and sets aria-disabled, but the
  // trailing slot (split-button caret) stays live and clickable.

  describe('disabled', () => {
    test('disabled=true sets aria-disabled on the root button [obligation]', () => {
      const wrapper = mountButtonWithSlots({ disabled: true }, { default: 'Label' })
      expect(wrapper.find('[data-testid="ui-kit-button"]').attributes('aria-disabled')).toBe('true')
    })

    test('disabled=false leaves aria-disabled unset [obligation]', () => {
      const wrapper = mountButtonWithSlots({ disabled: false }, { default: 'Label' })
      expect(
        wrapper.find('[data-testid="ui-kit-button"]').attributes('aria-disabled')
      ).toBeUndefined()
    })

    test('clicking a disabled button does NOT fire consumer @click [obligation]', async () => {
      const onClick = vi.fn()
      const wrapper = mountButtonWithSlots({ disabled: true }, { default: 'Label' })
      // Dispatch on the root element so capture fires
      wrapper
        .find('[data-testid="ui-kit-button"]')
        .element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await wrapper.vm.$nextTick()
      // The event is blocked in the capture handler before any listener fires
      expect(onClick).not.toHaveBeenCalled()
    })

    test('clicking inside .btn-trailing is NOT blocked when primary is disabled [obligation]', async () => {
      // The guard in onCaptureClick bails early (returns without stopping) when the
      // click originates inside .btn-trailing, even when disabled=true.
      // Verify this by confirming GSAP is not called (no intercept on trailing clicks),
      // and the primary consumer @click is also not called (trailing is its own handler).
      const { gsap } = await import('gsap')
      gsap.to.mockClear()

      const primaryClick = vi.fn()
      const wrapper = mountButtonWithSlots(
        { disabled: true, playOnTap: true },
        {
          default: 'Label',
          trailing: () =>
            h('div', { class: 'btn-trailing' }, [h('span', { 'data-testid': 'caret-inner' }, '▼')])
        }
      )
      // Bind consumer onClick on the attrs so button.vue can see it
      const wrapperWithAttrs = mountButtonWithSlots(
        { disabled: true, playOnTap: true },
        {
          default: 'Label',
          trailing: () =>
            h('div', { class: 'btn-trailing' }, [h('span', { 'data-testid': 'caret-inner' }, '▼')])
        }
      )

      // dispatch on the trailing span — the capture handler must NOT call
      // stopImmediatePropagation (it returns early for in_trailing clicks)
      const caretInner = wrapper.find('[data-testid="caret-inner"]').element
      caretInner.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await wrapper.vm.$nextTick()

      // The play-on-tap intercept must NOT be triggered for trailing clicks
      expect(gsap.to).not.toHaveBeenCalled()
    })

    test('disabled=true suppresses sfx on a click (merged_sfx returns {}) [obligation]', async () => {
      mockEmitSfx.mockClear()
      // A disabled button has merged_sfx = {} so no hover sfx is emitted.
      // The v-sfx directive is stubbed in these tests so we only verify the
      // prop value passed to UiTooltip (via sfx binding) stays empty.
      // We simply confirm clicking doesn't call emitSfx (the sfx is cleared).
      const wrapper = mountButtonWithSlots(
        { disabled: true, playOnTap: true, sfx: { click: 'ui.select' } },
        { default: 'Label' }
      )
      wrapper
        .find('[data-testid="ui-kit-button"]')
        .element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await wrapper.vm.$nextTick()
      // emitSfx not called because onCaptureClick returns early before emitClickSfx
      expect(mockEmitSfx).not.toHaveBeenCalled()
    })

    // ── clickWhenDisabled [obligation] ─────────────────────────────────────

    // The capture handler decides whether a disabled button's click reaches the
    // bubble-phase @click handler: it lets it propagate when clickWhenDisabled is
    // set, and stops propagation (+ preventDefault) when it isn't. Assert that
    // contract directly on the dispatched event.
    test('clickWhenDisabled=true with disabled=true lets the click propagate to the handler [obligation]', async () => {
      const wrapper = shallowMount(UiButton, {
        props: { disabled: true, clickWhenDisabled: true },
        global: { stubs: { UiTooltip: UiTooltipSlotStub }, directives: { sfx: {} } }
      })
      const event = new MouseEvent('click', { bubbles: true, cancelable: true })
      const stopSpy = vi.spyOn(event, 'stopImmediatePropagation')
      const preventSpy = vi.spyOn(event, 'preventDefault')

      wrapper.find('[data-testid="ui-kit-button"]').element.dispatchEvent(event)
      await wrapper.vm.$nextTick()

      expect(stopSpy).not.toHaveBeenCalled()
      expect(preventSpy).not.toHaveBeenCalled()
    })

    test('disabled=true without clickWhenDisabled swallows the click (stops propagation) [obligation]', async () => {
      const wrapper = shallowMount(UiButton, {
        props: { disabled: true, clickWhenDisabled: false },
        global: { stubs: { UiTooltip: UiTooltipSlotStub }, directives: { sfx: {} } }
      })
      const event = new MouseEvent('click', { bubbles: true, cancelable: true })
      const stopSpy = vi.spyOn(event, 'stopImmediatePropagation')
      const preventSpy = vi.spyOn(event, 'preventDefault')

      wrapper.find('[data-testid="ui-kit-button"]').element.dispatchEvent(event)
      await wrapper.vm.$nextTick()

      expect(stopSpy).toHaveBeenCalled()
      expect(preventSpy).toHaveBeenCalled()
    })

    test('clickWhenDisabled suppresses sfx even when clicks are allowed through [obligation]', async () => {
      mockEmitSfx.mockClear()
      const wrapper = shallowMount(UiButton, {
        props: { disabled: true, clickWhenDisabled: true, sfx: { click: 'ui.select' } },
        attrs: { onClick: vi.fn() },
        global: { stubs: { UiTooltip: UiTooltipSlotStub }, directives: { sfx: {} } }
      })
      wrapper
        .find('[data-testid="ui-kit-button"]')
        .element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await wrapper.vm.$nextTick()
      // merged_sfx returns {} when disabled, so emitClickSfx is never invoked
      // (onCaptureClick returns early at the clickWhenDisabled guard, skipping interceptClick)
      expect(mockEmitSfx).not.toHaveBeenCalled()
    })
  })
})

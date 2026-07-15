import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, withAttrs } from 'vue'
import ModalUiKit from '@/components/ui-kit/modal/index.vue'
import { useModal, useModalRequestClose, request_close_handlers } from '@/composables/modal'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockRegister, mockDispose, mockClearScope } = vi.hoisted(() => ({
  mockRegister: vi.fn(),
  mockDispose: vi.fn(),
  mockClearScope: vi.fn()
}))

vi.mock('@/composables/shortcuts', () => ({
  useShortcuts: vi.fn(() => ({
    register: mockRegister,
    dispose: mockDispose,
    clearScope: mockClearScope
  }))
}))

// gsap is imported transitively via modal-mode-config → animations/modal.
// The mock must call onComplete so transition-group JS hooks finish in browser mode.
vi.mock('gsap', () => ({
  gsap: {
    set: vi.fn(),
    fromTo: vi.fn((_el, _from, to) => to?.onComplete?.()),
    to: vi.fn((_el, opts) => opts?.onComplete?.())
  }
}))

const mobileBreakpointRef = ref(false)
const mockUseMobileBreakpoint = vi.fn(() => mobileBreakpointRef)

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: (...args) => mockUseMobileBreakpoint(...args)
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

// Module-level state persists across tests — reset both structures before each one.
beforeEach(() => {
  const { modal_stack, pop } = useModal()
  while (modal_stack.value.length > 0) pop()
  request_close_handlers.clear()
  mockUseMobileBreakpoint.mockClear()
  mobileBreakpointRef.value = false
})

const ModalStub = defineComponent({
  render() {
    return h('div', { 'data-testid': 'modal-stub' })
  }
})

// A modal whose body is a real overflow scroller, for boundary-chaining tests.
const ScrollableStub = defineComponent({
  render() {
    return h('div', { 'data-testid': 'scroll-stub', style: 'overflow-y: auto; height: 50px;' }, [
      h('div', { style: 'height: 500px;' })
    ])
  }
})

// A modal whose descendant sets its own explicit pointer-events-auto class —
// the real-world shape of settings-aside's edit-account button. Used to prove
// `inert` (not a naive pointer-events toggle on the ancestor) is what blocks it.
const PointerEventsAutoDescendantStub = defineComponent({
  props: ['onDescendantClick'],
  emits: ['descendant-click'],
  setup(_props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'pointer-events-descendant-host' }, [
        h(
          'button',
          {
            'data-testid': 'pointer-events-descendant-button',
            class: 'pointer-events-auto',
            onClick: () => emit('descendant-click')
          },
          'edit'
        )
      ])
  }
})

// Modal hosts attach real window listeners while open — unmount every mount so
// they don't leak into later tests.
const mounted = []

function mountModal() {
  const wrapper = mount(ModalUiKit, { attachTo: document.body })
  mounted.push(wrapper)
  return wrapper
}

afterEach(() => {
  while (mounted.length > 0) mounted.pop().unmount()
})

function containerMode(wrapper) {
  return wrapper.find('[data-testid="ui-kit-modal-container"]').attributes('data-modal-mode')
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('modal.vue', () => {
  describe('container data-modal-mode reflects top modal mode', () => {
    test('defaults to dialog when stack is empty', async () => {
      const wrapper = mountModal()

      expect(containerMode(wrapper)).toBe('dialog')
    })

    test('is dialog for a dialog modal', async () => {
      const { open } = useModal()
      open(ModalStub, { mode: 'dialog' })

      const wrapper = mountModal()
      await nextTick()

      expect(containerMode(wrapper)).toBe('dialog')
    })

    test('is mobile-sheet for a mobile-sheet modal', async () => {
      const { open } = useModal()
      open(ModalStub, { mode: 'mobile-sheet' })

      const wrapper = mountModal()
      await nextTick()

      expect(containerMode(wrapper)).toBe('mobile-sheet')
    })

    test('is popup for a popup modal', async () => {
      const { open } = useModal()
      open(ModalStub, { mode: 'popup' })

      const wrapper = mountModal()
      await nextTick()

      expect(containerMode(wrapper)).toBe('popup')
    })

    test('reflects the top (last) modal when multiple are stacked', async () => {
      const { open } = useModal()
      open(ModalStub, { mode: 'dialog' })
      open(ModalStub, { mode: 'mobile-sheet' })

      const wrapper = mountModal()
      await nextTick()

      expect(containerMode(wrapper)).toBe('mobile-sheet')
    })

    test('reverts to the underlying modal mode after the top modal is closed', async () => {
      const { open } = useModal()
      open(ModalStub, { mode: 'dialog' })
      const { close } = open(ModalStub, { mode: 'mobile-sheet' })

      const wrapper = mountModal()
      await nextTick()

      close()
      await nextTick()

      expect(containerMode(wrapper)).toBe('dialog')
    })
  })

  describe('data-modal-mode on rendered components', () => {
    test('sets data-modal-mode on each rendered component', async () => {
      const { open } = useModal()
      open(ModalStub, { mode: 'mobile-sheet' })

      const wrapper = mountModal()
      await nextTick()

      expect(wrapper.find('[data-testid="modal-stub"]').attributes('data-modal-mode')).toBe(
        'mobile-sheet'
      )
    })

    test('sets correct mode for dialog', async () => {
      const { open } = useModal()
      open(ModalStub, { mode: 'dialog' })

      const wrapper = mountModal()
      await nextTick()

      expect(wrapper.find('[data-testid="modal-stub"]').attributes('data-modal-mode')).toBe(
        'dialog'
      )
    })

    test('sets correct mode for popup', async () => {
      const { open } = useModal()
      open(ModalStub, { mode: 'popup' })

      const wrapper = mountModal()
      await nextTick()

      expect(wrapper.find('[data-testid="modal-stub"]').attributes('data-modal-mode')).toBe('popup')
    })
  })

  describe('simultaneous modals with different modes', () => {
    test('renders both modals when two are open', async () => {
      const { open } = useModal()
      open(ModalStub, { mode: 'mobile-sheet' })
      open(ModalStub, { mode: 'popup' })

      const wrapper = mountModal()
      await nextTick()

      expect(wrapper.findAll('[data-testid="modal-stub"]')).toHaveLength(2)
    })

    test('each modal wrapper carries its own data-modal-mode', async () => {
      const { open } = useModal()
      open(ModalStub, { mode: 'mobile-sheet' })
      open(ModalStub, { mode: 'popup' })

      const wrapper = mountModal()
      await nextTick()

      const stubs = wrapper.findAll('[data-testid="modal-stub"]')
      const modes = stubs.map((s) => s.attributes('data-modal-mode'))
      expect(modes).toContain('mobile-sheet')
      expect(modes).toContain('popup')
    })

    test('closing top modal leaves bottom modal with its own mode', async () => {
      const { open } = useModal()
      open(ModalStub, { mode: 'mobile-sheet' })
      const { close } = open(ModalStub, { mode: 'popup' })

      const wrapper = mountModal()
      await nextTick()

      close()
      await nextTick()

      expect(wrapper.findAll('[data-testid="modal-stub"]')).toHaveLength(1)
      expect(wrapper.find('[data-testid="modal-stub"]').attributes('data-modal-mode')).toBe(
        'mobile-sheet'
      )
    })
  })

  describe('backdrop', () => {
    test('does not render backdrop when no modals are open', async () => {
      const wrapper = mountModal()

      expect(wrapper.find('[data-testid="ui-kit-modal-backdrop"]').exists()).toBe(false)
    })

    test('renders backdrop when a modal with backdrop:true is open', async () => {
      const { open } = useModal()
      open(ModalStub, { backdrop: true })

      const wrapper = mountModal()
      await nextTick()

      expect(wrapper.find('[data-testid="ui-kit-modal-backdrop"]').exists()).toBe(true)
    })

    test('renders backdrop element even when backdrop:false', async () => {
      const { open } = useModal()
      open(ModalStub, { backdrop: false })

      const wrapper = mountModal()
      await nextTick()

      // Element renders but without the blur/tint modifier — presence is sufficient to assert
      expect(wrapper.find('[data-testid="ui-kit-modal-backdrop"]').exists()).toBe(true)
    })
  })

  describe('background scroll lock', () => {
    // The lock decides off `wheel`/`touchmove`; wheel is the simplest to forge
    // and runs through the exact same boundary logic.
    function fireWheel(target, deltaY = 50) {
      const event = new WheelEvent('wheel', { deltaY, cancelable: true, bubbles: true })
      target.dispatchEvent(event)
      return event
    }

    test('blocks background scroll while a modal is open', async () => {
      const { open } = useModal()
      open(ModalStub)

      mountModal()
      await nextTick()

      expect(fireWheel(document.body).defaultPrevented).toBe(true)
    })

    test('does not block scroll when no modal is open', async () => {
      mountModal()
      await nextTick()

      expect(fireWheel(document.body).defaultPrevented).toBe(false)
    })

    test('lets a scroll through when the modal scroller has room, so its content scrolls', async () => {
      const { open } = useModal()
      open(ScrollableStub)

      const wrapper = mountModal()
      await nextTick()

      const scroller = wrapper.find('[data-testid="scroll-stub"]').element
      scroller.scrollTop = 20 // mid-scroll: not at either edge

      expect(fireWheel(scroller, 50).defaultPrevented).toBe(false)
    })

    test('blocks a scroll at the modal scroller edge so it does not chain to the page', async () => {
      const { open } = useModal()
      open(ScrollableStub)

      const wrapper = mountModal()
      await nextTick()

      const scroller = wrapper.find('[data-testid="scroll-stub"]').element
      scroller.scrollTop = 0 // at the top, scrolling up

      expect(fireWheel(scroller, -50).defaultPrevented).toBe(true)
    })

    test('stops blocking background scroll once the last modal closes', async () => {
      const { open, pop } = useModal()
      open(ModalStub)

      mountModal()
      await nextTick()
      expect(fireWheel(document.body).defaultPrevented).toBe(true)

      pop()
      await nextTick()

      expect(fireWheel(document.body).defaultPrevented).toBe(false)
    })

    test('stops blocking background scroll on unmount', async () => {
      const { open } = useModal()
      open(ModalStub)

      const wrapper = mountModal()
      await nextTick()
      expect(fireWheel(document.body).defaultPrevented).toBe(true)

      wrapper.unmount()

      expect(fireWheel(document.body).defaultPrevented).toBe(false)
    })
  })
})

// ── modal wrapper click.self dispatch ────────────────────────────────────────

describe('modal wrapper click.self', () => {
  beforeEach(() => {
    const { modal_stack, pop } = useModal()
    while (modal_stack.value.length > 0) pop()
    request_close_handlers.clear()
  })

  test('clicking the wrapper itself (not its content) closes the top modal', async () => {
    const { open, modal_stack } = useModal()
    open(ModalStub)

    const wrapper = mountModal()
    await nextTick()

    await wrapper.find('[data-testid="ui-kit-modal"]').trigger('click')

    expect(modal_stack.value).toHaveLength(0)
  })

  test('clicking the wrapper calls requestClose handler when one is registered', async () => {
    const requestClose = vi.fn()
    const HandlerComponent = defineComponent({
      setup() {
        useModalRequestClose(requestClose)
      },
      render: () => h('div', { 'data-testid': 'handler-component' })
    })
    const { open, modal_stack } = useModal()
    open(HandlerComponent)

    const wrapper = mountModal()
    await nextTick()

    await wrapper.find('[data-testid="ui-kit-modal"]').trigger('click')

    expect(requestClose).toHaveBeenCalledOnce()
    expect(modal_stack.value).toHaveLength(1)
  })
})

// ── backdrop click / ESC requestClose dispatch ────────────────────────────────

describe('requestClose dispatch', () => {
  // Clear shortcut mock call history before each test so we can find the ESC handler reliably
  beforeEach(() => {
    mockRegister.mockClear()
  })

  function makeHandlerComponent(requestClose) {
    return defineComponent({
      setup() {
        useModalRequestClose(requestClose)
      },
      render: () => h('div', { 'data-testid': 'handler-component' })
    })
  }

  describe('backdrop click', () => {
    test('calls the registered requestClose handler when one is registered', async () => {
      const requestClose = vi.fn()
      const { open, modal_stack } = useModal()
      open(makeHandlerComponent(requestClose))

      const wrapper = mountModal()
      await nextTick()

      await wrapper.find('[data-testid="ui-kit-modal-backdrop"]').trigger('click')

      expect(requestClose).toHaveBeenCalledOnce()
      // Handler is responsible for closing — modal should still be open
      expect(modal_stack.value).toHaveLength(1)
    })

    test('pops the top modal when no requestClose handler is registered', async () => {
      const { open, modal_stack } = useModal()
      open(ModalStub)

      const wrapper = mountModal()
      await nextTick()

      await wrapper.find('[data-testid="ui-kit-modal-backdrop"]').trigger('click')

      expect(modal_stack.value).toHaveLength(0)
    })

    test('calls the handler for the top modal only when multiple are stacked', async () => {
      const bottomHandler = vi.fn()
      const topHandler = vi.fn()
      const { open, modal_stack } = useModal()
      open(makeHandlerComponent(bottomHandler))
      open(makeHandlerComponent(topHandler))

      const wrapper = mountModal()
      await nextTick()

      await wrapper.find('[data-testid="ui-kit-modal-backdrop"]').trigger('click')

      expect(topHandler).toHaveBeenCalledOnce()
      expect(bottomHandler).not.toHaveBeenCalled()
      expect(modal_stack.value).toHaveLength(2)
    })
  })

  describe('ESC key', () => {
    function invokeEscHandler() {
      const escCall = mockRegister.mock.calls.find((c) => c[0]?.combo === 'esc')
      escCall[0].handler()
    }

    test('calls the registered requestClose handler on ESC', async () => {
      const requestClose = vi.fn()
      const { open, modal_stack } = useModal()
      open(makeHandlerComponent(requestClose))

      mountModal()
      await nextTick()

      invokeEscHandler()

      expect(requestClose).toHaveBeenCalledOnce()
      expect(modal_stack.value).toHaveLength(1)
    })

    test('pops the top modal on ESC when no handler is registered', async () => {
      const { open, modal_stack } = useModal()
      open(ModalStub)

      mountModal()
      await nextTick()

      invokeEscHandler()

      expect(modal_stack.value).toHaveLength(0)
    })
  })
})

// ── mobile-breakpoint forwarding ─────────────────────────────────────────────

describe('mobile breakpoint forwarding', () => {
  beforeEach(() => {
    const { modal_stack, pop } = useModal()
    while (modal_stack.value.length > 0) pop()
    request_close_handlers.clear()
    mockUseMobileBreakpoint.mockClear()
  })

  test('sets data-mobile-below-width/height to "sm" when modal opens with no thresholds', async () => {
    const { open } = useModal()
    open(ModalStub)

    const wrapper = mountModal()
    await nextTick()

    const el = wrapper.find('[data-testid="ui-kit-modal"]')
    expect(el.attributes('data-mobile-below-width')).toBe('sm')
    expect(el.attributes('data-mobile-below-height')).toBe('sm')
  })

  test('sets data-mobile-below-width/height from open() args', async () => {
    const { open } = useModal()
    open(ModalStub, { mobile_below_width: 'md', mobile_below_height: 'lg' })

    const wrapper = mountModal()
    await nextTick()

    const el = wrapper.find('[data-testid="ui-kit-modal"]')
    expect(el.attributes('data-mobile-below-width')).toBe('md')
    expect(el.attributes('data-mobile-below-height')).toBe('lg')
  })

  test('each modal in the stack gets its own data-mobile-below attrs', async () => {
    const { open } = useModal()
    open(ModalStub, { mobile_below_width: 'sm', mobile_below_height: 'sm' })
    open(ModalStub, { mobile_below_width: 'lg', mobile_below_height: '2xl' })

    const wrapper = mountModal()
    await nextTick()

    const modals = wrapper.findAll('[data-testid="ui-kit-modal"]')
    const widths = modals.map((m) => m.attributes('data-mobile-below-width'))
    const heights = modals.map((m) => m.attributes('data-mobile-below-height'))
    expect(widths).toContain('sm')
    expect(widths).toContain('lg')
    expect(heights).toContain('sm')
    expect(heights).toContain('2xl')
  })
})

// ── recede/restore choreography [obligation] ─────────────────────────────────

describe('recede/restore choreography [obligation]', () => {
  beforeEach(() => {
    const { modal_stack, pop } = useModal()
    while (modal_stack.value.length > 0) pop()
    request_close_handlers.clear()
  })

  test('opening a second modal on top recedes the first (not the top) [obligation]', async () => {
    const { open } = useModal()
    const wrapper = mountModal()

    open(ModalStub)
    await nextTick()
    open(ModalStub)
    await nextTick()

    const entries = wrapper.findAll('[data-testid="modal-stub"]')
    expect(entries[0].element.inert).toBe(true)
    expect(entries[1].element.inert).toBe(false)
  })

  test('closing the top modal restores the previously-receded one [obligation]', async () => {
    const { open } = useModal()
    const wrapper = mountModal()

    open(ModalStub)
    await nextTick()
    const { close } = open(ModalStub)
    await nextTick()

    expect(wrapper.findAll('[data-testid="modal-stub"]')[0].element.inert).toBe(true)

    close()
    await nextTick()

    const entries = wrapper.findAll('[data-testid="modal-stub"]')
    expect(entries).toHaveLength(1)
    expect(entries[0].element.inert).toBe(false)
  })

  test('a batch jump in stack size (1 → 3 in one tick) still receded everything except the top [obligation]', async () => {
    const { open } = useModal()
    const wrapper = mountModal()

    open(ModalStub)
    await nextTick()

    // Open two more synchronously, in the same tick — simulates the stack
    // changing by more than one entry at once, not one push at a time.
    open(ModalStub)
    open(ModalStub)
    await nextTick()

    const entries = wrapper.findAll('[data-testid="modal-stub"]')
    expect(entries).toHaveLength(3)
    expect(entries[0].element.inert).toBe(true)
    expect(entries[1].element.inert).toBe(true)
    expect(entries[2].element.inert).toBe(false)
  })

  test('a batch shrink in stack size (3 → 1 in one tick) still restores the sole remaining entry [obligation]', async () => {
    const { open, pop } = useModal()
    const wrapper = mountModal()

    open(ModalStub)
    await nextTick()
    open(ModalStub)
    await nextTick()
    open(ModalStub)
    await nextTick()

    expect(wrapper.findAll('[data-testid="modal-stub"]')[0].element.inert).toBe(true)

    // Pop two synchronously, in the same tick — simulates the stack
    // collapsing by more than one entry at once, not one pop at a time.
    pop()
    pop()
    await nextTick()

    const entries = wrapper.findAll('[data-testid="modal-stub"]')
    expect(entries).toHaveLength(1)
    expect(entries[0].element.inert).toBe(false)
  })
})

// ── receded modal blocks clicks via `inert`, even with a descendant
// pointer-events-auto override [obligation] ──────────────────────────────────

describe('a receded modal is unclickable even when a descendant sets pointer-events-auto [obligation]', () => {
  beforeEach(() => {
    const { modal_stack, pop } = useModal()
    while (modal_stack.value.length > 0) pop()
    request_close_handlers.clear()
  })

  // `trigger('click')` dispatches a synthetic event directly at the target,
  // which bypasses the browser's own hit-testing/interaction gating (the same
  // gap the `pointer-events-auto` class exploited before the fix). `inert`'s
  // actual guarantee — unfocusable, un-hit-testable descendants — is asserted
  // via focus, since that's enforced by the browser regardless of how the
  // interaction was dispatched.
  test('a pointer-events-auto descendant of the receded (non-top) modal cannot receive focus [obligation]', async () => {
    const onDescendantClick = vi.fn()
    const { open } = useModal()
    const wrapper = mountModal()

    open(PointerEventsAutoDescendantStub, { props: { onDescendantClick } })
    await nextTick()
    open(ModalStub)
    await nextTick()

    const host = wrapper.find('[data-testid="pointer-events-descendant-host"]')
    expect(host.element.inert).toBe(true)

    const button = wrapper.find('[data-testid="pointer-events-descendant-button"]').element
    button.focus()

    expect(document.activeElement).not.toBe(button)
  })

  test('the same pointer-events-auto descendant can receive focus once its modal becomes the top again [obligation]', async () => {
    const onDescendantClick = vi.fn()
    const { open } = useModal()
    const wrapper = mountModal()

    open(PointerEventsAutoDescendantStub, { props: { onDescendantClick } })
    await nextTick()
    const { close } = open(ModalStub)
    await nextTick()

    close()
    await nextTick()

    const host = wrapper.find('[data-testid="pointer-events-descendant-host"]')
    expect(host.element.inert).toBe(false)

    const button = wrapper.find('[data-testid="pointer-events-descendant-button"]').element
    button.focus()

    expect(document.activeElement).toBe(button)
  })
})

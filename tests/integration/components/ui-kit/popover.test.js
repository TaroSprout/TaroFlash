import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { useFloating } from '@floating-ui/vue'
import UiPopover from '@/components/ui-kit/popover.vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

// Mutable state objects shared between the mock factory and the tests.
// vi.hoisted runs before module imports so Vue's ref() is not available here —
// plain objects with a `.value` property work just as well for the mock.
const { floatingState } = vi.hoisted(() => {
  const floatingState = {
    placement: { value: 'top' },
    middlewareData: { value: {} },
    floatingStyles: { value: {} }
  }
  return { floatingState }
})

const { sizeMock } = vi.hoisted(() => ({
  sizeMock: vi.fn(() => ({}))
}))

vi.mock('@floating-ui/vue', () => ({
  useFloating: vi.fn(() => ({
    placement: floatingState.placement,
    middlewareData: floatingState.middlewareData,
    floatingStyles: floatingState.floatingStyles
  })),
  shift: vi.fn(() => ({})),
  flip: vi.fn(() => ({})),
  autoUpdate: vi.fn(),
  arrow: vi.fn(() => ({})),
  offset: vi.fn(() => ({})),
  hide: vi.fn(() => ({})),
  size: sizeMock
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

// Integration tests run in Chromium browser mode. <Teleport> and <Transition>
// are Vue built-ins that shallowMount stubs away, preventing content from
// rendering. We use full mount + attachTo: document.body so the component tree
// is inserted into the live document and wrapper.find() traverses it fully.

const wrappers = []

function mountPopover(props = {}, slots = {}, mountOptions = {}) {
  const wrapper = mount(UiPopover, {
    props,
    slots,
    attachTo: document.body,
    ...mountOptions
  })
  wrappers.push(wrapper)
  return wrapper
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('UiPopover', () => {
  beforeEach(() => {
    floatingState.placement.value = 'top'
    floatingState.middlewareData.value = {}
    useFloating.mockClear()
    sizeMock.mockClear()
  })

  afterEach(() => {
    wrappers.forEach((w) => w.unmount())
    wrappers.length = 0
    document.body.innerHTML = ''
  })

  // ── Structure ──────────────────────────────────────────────────────────────

  test('renders the container element', () => {
    const wrapper = mountPopover()
    expect(wrapper.find('[data-testid="ui-kit-popover-container"]').exists()).toBe(true)
  })

  // ── open prop — popover visibility ─────────────────────────────────────────

  test('popover is not visible when open=false and mode=click', () => {
    const wrapper = mountPopover({ open: false, mode: 'click' })
    expect(wrapper.find('[data-testid="ui-kit-popover"]').exists()).toBe(false)
  })

  test('popover is visible when open=true and mode=click', () => {
    const wrapper = mountPopover({ open: true, mode: 'click' })
    expect(wrapper.find('[data-testid="ui-kit-popover"]').exists()).toBe(true)
  })

  test('popover is always rendered when mode=hover', () => {
    const wrapper = mountPopover({ open: false, mode: 'hover' })
    expect(wrapper.find('[data-testid="ui-kit-popover"]').exists()).toBe(true)
  })

  // ── arrow rendering ────────────────────────────────────────────────────────

  test('renders arrow element by default (use_arrow=true)', () => {
    const wrapper = mountPopover({ open: true })
    expect(wrapper.find('[data-testid="ui-kit-popover__arrow"]').exists()).toBe(true)
  })

  test('does not render arrow when use_arrow=false', () => {
    const wrapper = mountPopover({ open: true, use_arrow: false })
    expect(wrapper.find('[data-testid="ui-kit-popover__arrow"]').exists()).toBe(false)
  })

  // ── arrow slot ─────────────────────────────────────────────────────────────

  test('custom arrow slot renders in place of the default arrow', () => {
    const wrapper = mountPopover(
      { open: true },
      { arrow: '<div data-testid="custom-arrow">▲</div>' }
    )
    expect(wrapper.find('[data-testid="custom-arrow"]').exists()).toBe(true)
  })

  // ── arrowStyle — staticSide placement ─────────────────────────────────────

  test('arrowStyle sets bottom offset for top placement', () => {
    floatingState.placement.value = 'top'
    const wrapper = mountPopover({ open: true })
    const arrowEl = wrapper.find('[data-testid="ui-kit-popover__arrow"]')
    expect(arrowEl.attributes('style')).toContain('bottom: -10px')
  })

  test('arrowStyle sets top offset for bottom placement', () => {
    floatingState.placement.value = 'bottom'
    const wrapper = mountPopover({ open: true })
    const arrowEl = wrapper.find('[data-testid="ui-kit-popover__arrow"]')
    expect(arrowEl.attributes('style')).toContain('top: -10px')
  })

  test('arrowStyle sets right offset for left placement', () => {
    floatingState.placement.value = 'left'
    const wrapper = mountPopover({ open: true })
    const arrowEl = wrapper.find('[data-testid="ui-kit-popover__arrow"]')
    expect(arrowEl.attributes('style')).toContain('right: -10px')
  })

  test('arrowStyle sets left offset for right placement', () => {
    floatingState.placement.value = 'right'
    const wrapper = mountPopover({ open: true })
    const arrowEl = wrapper.find('[data-testid="ui-kit-popover__arrow"]')
    expect(arrowEl.attributes('style')).toContain('left: -10px')
  })

  // ── arrowStyle — x/y from middlewareData ──────────────────────────────────

  test('arrowStyle positions arrow using x from middlewareData', async () => {
    floatingState.placement.value = 'top'
    floatingState.middlewareData.value = { arrow: { x: 30 } }
    const wrapper = mountPopover({ open: true })
    await nextTick()
    const arrowEl = wrapper.find('[data-testid="ui-kit-popover__arrow"]')
    expect(arrowEl.attributes('style')).toContain('left: 30px')
  })

  test('arrowStyle positions arrow using y from middlewareData', async () => {
    floatingState.placement.value = 'right'
    floatingState.middlewareData.value = { arrow: { y: 15 } }
    const wrapper = mountPopover({ open: true })
    await nextTick()
    const arrowEl = wrapper.find('[data-testid="ui-kit-popover__arrow"]')
    expect(arrowEl.attributes('style')).toContain('top: 15px')
  })

  // ── anchor_rect — virtual reference element ─────────────────────────────────

  test('anchors against a virtual element returning the provided rect when anchor_rect is set', () => {
    const rect = new DOMRect(10, 20, 30, 40)
    mountPopover({ open: true, anchor_rect: rect })

    const reference = useFloating.mock.calls.at(-1)[0]
    expect(reference.value.getBoundingClientRect()).toBe(rect)
  })

  test('falls back to the trigger element when anchor_rect is not provided', () => {
    mountPopover({ open: true })

    const reference = useFloating.mock.calls.at(-1)[0]
    expect(reference.value).toBeInstanceOf(HTMLElement)
  })

  // ── close event on outside click ───────────────────────────────────────────

  test('outside-click listener fires in capture phase (sees clicks even when stopPropagation is used)', async () => {
    const wrapper = mountPopover({ open: false, mode: 'click' })
    await wrapper.setProps({ open: true })

    const outside = document.createElement('button')
    document.body.appendChild(outside)

    // Simulate a child handler that swallows bubble-phase events.
    outside.addEventListener('click', (e) => e.stopPropagation())
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    outside.remove()
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  test('emits close when a click occurs outside the container (mode=click)', async () => {
    // The watcher only registers the click listener on the open false→true transition.
    const wrapper = mountPopover({ open: false, mode: 'click' })
    await wrapper.setProps({ open: true })

    // Create an element outside the component and click it — `document` itself
    // doesn't support `.closest()` which the handler requires.
    const outside = document.createElement('div')
    document.body.appendChild(outside)
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    outside.remove()

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  // ── default (no teleport) — panel renders inline ───────────────────────────

  test('default: panel renders inside the container (not teleported) [obligation]', () => {
    const wrapper = mountPopover({ open: true })
    // The panel must be a descendant of the container — content stays inline
    // when teleport is not set (default disabled teleport).
    const container = wrapper.find('[data-testid="ui-kit-popover-container"]')
    expect(container.find('[data-testid="ui-kit-popover"]').exists()).toBe(true)
  })

  // ── teleport=true — panel renders to body ─────────────────────────────────

  test('panel renders to <body> and is present when open=true with teleport=true [obligation]', () => {
    mountPopover({ open: true, teleport: true })
    const panel = document.body.querySelector('[data-testid="ui-kit-popover"]')
    expect(panel).not.toBeNull()
  })

  test('panel is absent in the DOM when open=false with teleport=true', () => {
    mountPopover({ open: false, teleport: true })
    const panel = document.body.querySelector('[data-testid="ui-kit-popover"]')
    expect(panel).toBeNull()
  })

  // ── teleport + click-outside ───────────────────────────────────────────────

  test('click-outside closes a teleported popover [obligation]', async () => {
    const wrapper = mountPopover({ open: false, mode: 'click', teleport: true })
    await wrapper.setProps({ open: true })

    const outside = document.createElement('div')
    document.body.appendChild(outside)
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    outside.remove()
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  test('click inside the teleported panel does NOT close the popover [obligation]', async () => {
    const wrapper = mountPopover({ open: false, mode: 'click', teleport: true })
    await wrapper.setProps({ open: true })

    const panel = document.body.querySelector('[data-testid="ui-kit-popover"]')
    expect(panel).not.toBeNull()

    panel.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    expect(wrapper.emitted('close')).toBeFalsy()
  })

  // ── match_reference_width prop — size middleware wiring [obligation] ─────────

  test('match_reference_width=true causes the size middleware to be included [obligation]', () => {
    mountPopover({ open: true, match_reference_width: true })
    // The `size` middleware factory must have been called to build the middleware array
    expect(sizeMock).toHaveBeenCalledOnce()
  })

  test('match_reference_width=false (default) does NOT include the size middleware [obligation]', () => {
    mountPopover({ open: true })
    expect(sizeMock).not.toHaveBeenCalled()
  })

  test('match_reference_width=false leaves the popover with no inline minWidth set [obligation]', () => {
    // Without the size middleware the floating element carries no minWidth from
    // floating-ui — the mock returns empty floatingStyles so nothing is injected.
    const wrapper = mountPopover({ open: true, match_reference_width: false })
    const panel = wrapper.find('[data-testid="ui-kit-popover"]')
    const style = panel.attributes('style') ?? ''
    expect(style).not.toContain('min-width')
  })
})

import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import UiAlert from '@/components/ui-kit/alert.vue'
import { MODAL_ID_KEY, request_close_handlers } from '@/composables/modal'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

// ── Mount helper ──────────────────────────────────────────────────────────────

// The alert renders only the box — the modal host owns the backdrop and routes
// backdrop-click / esc through the handler the alert registers via
// useModalRequestClose. Provide a MODAL_ID_KEY so that registration happens.
function makeWrapper(props = {}, { modalId = 'test-alert' } = {}) {
  const close = vi.fn()
  const wrapper = mount(UiAlert, {
    props: {
      close,
      ...props
    },
    attachTo: document.body,
    global: {
      directives: { sfx: {} },
      provide: { [MODAL_ID_KEY]: modalId }
    }
  })
  return { wrapper, close, modalId }
}

function cancelButton(wrapper) {
  return wrapper.find('[data-testid="ui-kit-alert__cancel"]')
}

function confirmButton(wrapper) {
  return wrapper.find('[data-testid="ui-kit-alert__confirm"]')
}

beforeEach(() => {
  mockEmitSfx.mockClear()
  request_close_handlers.clear()
  document.body.innerHTML = ''
})

// ── cancel ────────────────────────────────────────────────────────────────────

describe('UiAlert — cancel [obligation]', () => {
  test('cancel resolves false [obligation]', async () => {
    const { wrapper, close } = makeWrapper()

    await cancelButton(wrapper).trigger('click')

    expect(close).toHaveBeenCalledWith(false)
  })
})

// ── confirm ───────────────────────────────────────────────────────────────────

describe('UiAlert — confirm [obligation]', () => {
  test('confirm resolves true [obligation]', async () => {
    const { wrapper, close } = makeWrapper({ confirmLabel: 'Delete it' })

    await confirmButton(wrapper).trigger('click')

    expect(close).toHaveBeenCalledWith(true)
  })
})

// ── dismissal via modal machinery ─────────────────────────────────────────────

describe('UiAlert — request-close dismissal [obligation]', () => {
  test('registers a request-close handler (backdrop click / esc) that resolves false, like cancel — never confirm [obligation]', () => {
    const { close, modalId } = makeWrapper({ confirmLabel: 'Delete it' })

    // The modal host invokes this handler on backdrop click or esc.
    request_close_handlers.get(modalId)()

    expect(close).toHaveBeenCalledWith(false)
  })

  test('clicking inside the alert box does not close it [obligation]', async () => {
    const { wrapper, close } = makeWrapper({ confirmLabel: 'Delete it' })

    await wrapper.find('[data-testid="ui-kit-alert"]').trigger('click')

    expect(close).not.toHaveBeenCalled()
  })
})

// ── arrow-key focus nav ────────────────────────────────────────────────────

describe('UiAlert — arrow-key focus nav', () => {
  test('ArrowRight moves focus from cancel to confirm', async () => {
    const { wrapper } = makeWrapper({ confirmLabel: 'Delete it' })
    cancelButton(wrapper).element.focus()

    await wrapper
      .find('[data-testid="ui-kit-alert__actions"]')
      .trigger('keydown', { key: 'ArrowRight' })

    expect(document.activeElement).toBe(confirmButton(wrapper).element)
  })

  test('ArrowLeft moves focus from confirm to cancel', async () => {
    const { wrapper } = makeWrapper({ confirmLabel: 'Delete it' })
    confirmButton(wrapper).element.focus()

    await wrapper
      .find('[data-testid="ui-kit-alert__actions"]')
      .trigger('keydown', { key: 'ArrowLeft' })

    expect(document.activeElement).toBe(cancelButton(wrapper).element)
  })

  test('other keys do not move focus [obligation]', async () => {
    const { wrapper } = makeWrapper({ confirmLabel: 'Delete it' })
    cancelButton(wrapper).element.focus()

    await wrapper.find('[data-testid="ui-kit-alert__actions"]').trigger('keydown', { key: 'Tab' })

    expect(document.activeElement).toBe(cancelButton(wrapper).element)
  })
})

// ── station [obligation] ────────────────────────────────────────────────────

describe('UiAlert — station [obligation]', () => {
  test('stamps the constant data-station="window" [obligation]', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="ui-kit-alert"]').attributes('data-station')).toBe('window')
  })
})

// ── mobile layout utilities ───────────────────────────────────────────────────

describe('UiAlert — mobile layout', () => {
  test('alert box swaps fixed width for edge margin below the mobile threshold', () => {
    const { wrapper } = makeWrapper()
    const classes = wrapper.find('[data-testid="ui-kit-alert"]').classes()
    expect(classes).toContain('w-115')
    expect(classes).toContain('max-xs:w-auto')
    expect(classes).toContain('max-xs:max-w-full')
    expect(classes).toContain('max-xs:mx-4')
  })

  test('actions row stacks vertically with a horizontal divider below the mobile threshold', () => {
    const { wrapper } = makeWrapper({ confirmLabel: 'Delete it' })
    const classes = wrapper.find('[data-testid="ui-kit-alert__actions"]').classes()
    expect(classes).toContain('divide-x')
    expect(classes).toContain('max-xs:flex-col')
    expect(classes).toContain('max-xs:divide-x-0')
    expect(classes).toContain('max-xs:divide-y')
  })
})

// ── Confirm palette ───────────────────────────────────────────────────────────

describe('UiAlert — confirm palette', () => {
  test('defaults to the danger palette', () => {
    const { wrapper } = makeWrapper({ confirmLabel: 'Delete it' })
    expect(confirmButton(wrapper).attributes('data-palette')).toBe('danger')
  })

  test('uses the info palette for info alerts', () => {
    const { wrapper } = makeWrapper({ confirmLabel: 'Got it', type: 'info' })
    expect(confirmButton(wrapper).attributes('data-palette')).toBe('info')
  })
})

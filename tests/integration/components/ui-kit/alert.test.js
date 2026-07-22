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

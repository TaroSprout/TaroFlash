import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import UiAlert from '@/components/ui-kit/alert.vue'
import { makeOverlayContext, OVERLAY_CONTEXT_KEY } from '@tests/fixtures/overlay'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

// ── Mount helper ──────────────────────────────────────────────────────────────

// The alert renders only the box — overlay-surface (the real component here)
// owns the backdrop and routes a self-click through the overlay context's
// dismiss(), separate from the alert's own close(outcome) on cancel/confirm.
function makeWrapper(props = {}, overrides = {}) {
  const close = vi.fn()
  const dismiss = vi.fn()
  const wrapper = mount(UiAlert, {
    props,
    attachTo: document.body,
    global: {
      provide: { [OVERLAY_CONTEXT_KEY]: makeOverlayContext({ close, dismiss, ...overrides }) }
    }
  })
  return { wrapper, close, dismiss }
}

function cancelButton(wrapper) {
  return wrapper.find('[data-testid="ui-kit-alert__cancel"]')
}

function confirmButton(wrapper) {
  return wrapper.find('[data-testid="ui-kit-alert__confirm"]')
}

beforeEach(() => {
  mockEmitSfx.mockClear()
  document.body.innerHTML = ''
})

// ── cancel ────────────────────────────────────────────────────────────────────

describe('UiAlert — cancel', () => {
  test('cancel resolves false via the overlay context close', async () => {
    const { wrapper, close } = makeWrapper()

    await cancelButton(wrapper).trigger('click')

    expect(close).toHaveBeenCalledWith(false)
  })
})

// ── confirm ───────────────────────────────────────────────────────────────────

describe('UiAlert — confirm', () => {
  test('confirm resolves true via the overlay context close', async () => {
    const { wrapper, close } = makeWrapper({ confirmLabel: 'Delete it' })

    await confirmButton(wrapper).trigger('click')

    expect(close).toHaveBeenCalledWith(true)
  })
})

// ── dismissal via the overlay-surface backdrop ────────────────────────────────

describe('UiAlert — backdrop dismissal', () => {
  test('a click on the overlay-surface routes through the overlay context dismiss, not close', async () => {
    const { wrapper, close, dismiss } = makeWrapper({ confirmLabel: 'Delete it' })

    await wrapper.find('[data-testid="overlay-surface"]').trigger('click')

    expect(dismiss).toHaveBeenCalledTimes(1)
    expect(close).not.toHaveBeenCalled()
  })

  test('clicking inside the alert box does not dismiss or close it', async () => {
    const { wrapper, close, dismiss } = makeWrapper({ confirmLabel: 'Delete it' })

    await wrapper.find('[data-testid="ui-kit-alert"]').trigger('click')

    expect(dismiss).not.toHaveBeenCalled()
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

  test('other keys do not move focus', async () => {
    const { wrapper } = makeWrapper({ confirmLabel: 'Delete it' })
    cancelButton(wrapper).element.focus()

    await wrapper.find('[data-testid="ui-kit-alert__actions"]').trigger('keydown', { key: 'Tab' })

    expect(document.activeElement).toBe(cancelButton(wrapper).element)
  })
})

// ── station ────────────────────────────────────────────────────

describe('UiAlert — station', () => {
  test('stamps the constant data-station="float"', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="ui-kit-alert"]').attributes('data-station')).toBe('float')
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

// ── audio ──────────────────────────────────────────────────────────────────────

describe('UiAlert — audio', () => {
  test('plays cancelAudio when cancelled, when provided', async () => {
    const { wrapper } = makeWrapper({ cancelAudio: 'dialog.dismiss' })
    await cancelButton(wrapper).trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('dialog.dismiss')
  })

  test('plays confirmAudio when confirmed, when provided', async () => {
    const { wrapper } = makeWrapper({ confirmLabel: 'Delete it', confirmAudio: 'card.delete' })
    await confirmButton(wrapper).trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('card.delete')
  })

  test('plays no sfx on cancel when cancelAudio is omitted', async () => {
    const { wrapper } = makeWrapper()
    await cancelButton(wrapper).trigger('click')
    expect(mockEmitSfx).not.toHaveBeenCalled()
  })
})

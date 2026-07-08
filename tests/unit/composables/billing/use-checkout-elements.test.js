import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp, h } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const { mockLoadStripe, mockLoadStripeSideEffecting } = vi.hoisted(() => ({
  mockLoadStripe: vi.fn(),
  // The default `@stripe/stripe-js` entry point self-injects a <script> +
  // fraud-detection <iframe> as a top-level side effect on import — even
  // when this export is never called. Guarded against in the
  // "regression guard" describe block below.
  mockLoadStripeSideEffecting: vi.fn()
}))

// The composable must import `loadStripe` from the side-effect-free `/pure`
// entry point — see the regression-guard block below for why.
vi.mock('@stripe/stripe-js/pure', () => ({ loadStripe: mockLoadStripe }))
vi.mock('@stripe/stripe-js', () => ({ loadStripe: mockLoadStripeSideEffecting }))
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }))
vi.mock('@/stores/theme', async () => {
  const { ref } = await import('vue')
  const is_dark = ref(false)
  return { useThemeStore: () => ({ is_dark }) }
})

import { useCheckoutElements } from '@/composables/billing/use-checkout-elements'
import { useThemeStore } from '@/stores/theme'
import { getStripeAppearance, STRIPE_FONTS } from '@/utils/billing/stripe-theme'

let app

afterEach(() => {
  app?.unmount()
  app = null
})

// useTemplateRef needs a real render tree with a matching `ref` element, so
// mount a host component instead of calling the composable bare.
function withSetup(options) {
  let result
  app = createApp({
    setup() {
      result = useCheckoutElements(options)
      return () => h('div', { ref: 'container' })
    }
  })
  app.mount(document.createElement('div'))
  return result
}

function makePaymentElement() {
  const handlers = new Map()
  return {
    on: vi.fn((event, handler) => handlers.set(event, handler)),
    mount: vi.fn(),
    destroy: vi.fn(),
    fireReady: () => handlers.get('ready')?.()
  }
}

function makeCheckoutSdk({
  paymentElement = makePaymentElement(),
  loadActions,
  changeAppearance
} = {}) {
  return {
    createPaymentElement: vi.fn(() => paymentElement),
    loadActions: loadActions ?? vi.fn(),
    changeAppearance: changeAppearance ?? vi.fn()
  }
}

function makeStripe({ checkout = makeCheckoutSdk() } = {}) {
  return { initCheckoutElementsSdk: vi.fn(() => checkout) }
}

function baseOptions(overrides = {}) {
  return {
    publicKey: 'pk_test_x',
    genericErrorMessage: 'Something went wrong.',
    getClientSecret: vi.fn().mockResolvedValue('cs_secret_x'),
    ...overrides
  }
}

beforeEach(() => {
  mockLoadStripe.mockReset()
  mockLoadStripeSideEffecting.mockReset()
  useThemeStore().is_dark.value = false
})

describe('useCheckoutElements — mount lifecycle', () => {
  test('loads Stripe.js + the client secret in parallel, mounts the Payment Element, flips is_ready', async () => {
    const paymentElement = makePaymentElement()
    const checkout = makeCheckoutSdk({ paymentElement })
    const stripe = makeStripe({ checkout })
    mockLoadStripe.mockResolvedValue(stripe)

    const result = withSetup(baseOptions())
    expect(result.is_loading.value).toBe(true)
    await flushPromises()

    expect(result.is_loading.value).toBe(false)
    expect(result.load_error.value).toBe(false)
    expect(paymentElement.mount).toHaveBeenCalledTimes(1)
    expect(result.is_ready.value).toBe(false)

    paymentElement.fireReady()
    expect(result.is_ready.value).toBe(true)
  })

  test('[obligation] does not return a submit_error field — Stripe surfaces inline errors itself', async () => {
    mockLoadStripe.mockResolvedValue(makeStripe())

    const result = withSetup(baseOptions())
    await flushPromises()

    expect('submit_error' in result).toBe(false)
  })

  test('initCheckoutElementsSdk is called with the resolved client secret', async () => {
    const stripe = makeStripe()
    mockLoadStripe.mockResolvedValue(stripe)
    const getClientSecret = vi.fn().mockResolvedValue('cs_specific')

    withSetup(baseOptions({ getClientSecret }))
    await flushPromises()

    expect(stripe.initCheckoutElementsSdk).toHaveBeenCalledWith(
      expect.objectContaining({ clientSecret: 'cs_specific' })
    )
  })

  test('sets load_error when Stripe.js fails to load (resolves null)', async () => {
    mockLoadStripe.mockResolvedValue(null)

    const result = withSetup(baseOptions())
    await flushPromises()

    expect(result.load_error.value).toBe(true)
    expect(result.is_loading.value).toBe(false)
  })

  test('sets load_error when getClientSecret rejects', async () => {
    mockLoadStripe.mockResolvedValue(makeStripe())

    const result = withSetup(
      baseOptions({ getClientSecret: vi.fn().mockRejectedValue(new Error('network down')) })
    )
    await flushPromises()

    expect(result.load_error.value).toBe(true)
  })

  test('destroys the Payment Element on unmount', async () => {
    const paymentElement = makePaymentElement()
    mockLoadStripe.mockResolvedValue(makeStripe({ checkout: makeCheckoutSdk({ paymentElement }) }))

    withSetup(baseOptions())
    await flushPromises()

    app.unmount()
    expect(paymentElement.destroy).toHaveBeenCalledTimes(1)
  })
})

describe('useCheckoutElements — confirm()', () => {
  async function setupReady({ loadActions } = {}) {
    const checkout = makeCheckoutSdk({ loadActions })
    mockLoadStripe.mockResolvedValue(makeStripe({ checkout }))
    const result = withSetup(baseOptions())
    await flushPromises()
    return { result, checkout }
  }

  test('[obligation] calls actions.confirm() with only { redirect: "if_required" } — no returnUrl', async () => {
    const confirmSpy = vi.fn().mockResolvedValue({
      type: 'success',
      session: { status: { type: 'complete' } }
    })
    const loadActions = vi
      .fn()
      .mockResolvedValue({ type: 'success', actions: { confirm: confirmSpy } })
    const { result } = await setupReady({ loadActions })

    await result.confirm()

    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(confirmSpy).toHaveBeenCalledWith({ redirect: 'if_required' })
    const [args] = confirmSpy.mock.calls[0]
    expect('returnUrl' in args).toBe(false)
  })

  test('[obligation] does not leave is_submitting stuck when actions.confirm() throws an IntegrationError', async () => {
    const confirmSpy = vi
      .fn()
      .mockRejectedValue(
        new Error(
          'You cannot provide `returnUrl` to confirm() when `return_url` was already provided when creating the Checkout Session.'
        )
      )
    const loadActions = vi
      .fn()
      .mockResolvedValue({ type: 'success', actions: { confirm: confirmSpy } })
    const { result } = await setupReady({ loadActions })

    await result.confirm().catch(() => {})

    expect(result.is_submitting.value).toBe(false)
  })

  test('returns success when confirm resolves a complete session', async () => {
    const session = { status: { type: 'complete' }, savedPaymentMethods: [] }
    const loadActions = vi.fn().mockResolvedValue({
      type: 'success',
      actions: { confirm: vi.fn().mockResolvedValue({ type: 'success', session }) }
    })
    const { result } = await setupReady({ loadActions })

    const outcome = await result.confirm()

    expect(outcome).toEqual({ status: 'success', session })
    expect(result.is_submitting.value).toBe(false)
  })

  test('treats a success-typed result with a non-complete session as an error', async () => {
    const session = { status: { type: 'open' } }
    const loadActions = vi.fn().mockResolvedValue({
      type: 'success',
      actions: { confirm: vi.fn().mockResolvedValue({ type: 'success', session }) }
    })
    const { result } = await setupReady({ loadActions })

    const outcome = await result.confirm()

    expect(outcome).toEqual({ status: 'error', message: 'Something went wrong.' })
  })

  test('surfaces the error and resets is_submitting when loadActions() returns type error', async () => {
    const loadActions = vi.fn().mockResolvedValue({
      type: 'error',
      error: { message: 'Could not load actions.' }
    })
    const { result } = await setupReady({ loadActions })

    const outcome = await result.confirm()

    expect(outcome).toEqual({ status: 'error', message: 'Could not load actions.' })
    expect(result.is_submitting.value).toBe(false)
  })

  test('surfaces the error and resets is_submitting when actions.confirm() returns type error', async () => {
    const loadActions = vi.fn().mockResolvedValue({
      type: 'success',
      actions: {
        confirm: vi.fn().mockResolvedValue({ type: 'error', error: { message: 'Card declined.' } })
      }
    })
    const { result } = await setupReady({ loadActions })

    const outcome = await result.confirm()

    expect(outcome).toEqual({ status: 'error', message: 'Card declined.' })
    expect(result.is_submitting.value).toBe(false)
  })

  test('falls back to the generic error message when the SDK error has no message', async () => {
    const loadActions = vi.fn().mockResolvedValue({ type: 'error', error: {} })
    const { result } = await setupReady({ loadActions })

    const outcome = await result.confirm()

    expect(outcome).toEqual({ status: 'error', message: 'Something went wrong.' })
  })

  test('returns a generic error immediately when called before the Checkout SDK has initialized', async () => {
    mockLoadStripe.mockReturnValue(new Promise(() => {})) // never resolves
    const result = withSetup(baseOptions())

    const outcome = await result.confirm()

    expect(outcome).toEqual({ status: 'error', message: 'Something went wrong.' })
  })
})

describe('useCheckoutElements — dark-mode reactivity', () => {
  test('[obligation] initializes the Checkout SDK with the light appearance when is_dark starts false', async () => {
    const stripe = makeStripe()
    mockLoadStripe.mockResolvedValue(stripe)

    withSetup(baseOptions())
    await flushPromises()

    expect(stripe.initCheckoutElementsSdk).toHaveBeenCalledWith(
      expect.objectContaining({
        elementsOptions: { appearance: getStripeAppearance(false), fonts: STRIPE_FONTS }
      })
    )
  })

  test('[obligation] calls checkout.changeAppearance when is_dark toggles after mount, not just at init', async () => {
    const changeAppearance = vi.fn()
    const checkout = makeCheckoutSdk({ changeAppearance })
    mockLoadStripe.mockResolvedValue(makeStripe({ checkout }))

    withSetup(baseOptions())
    await flushPromises()
    expect(changeAppearance).not.toHaveBeenCalled()

    useThemeStore().is_dark.value = true
    await flushPromises()

    expect(changeAppearance).toHaveBeenCalledWith(getStripeAppearance(true))
  })
})

describe('useCheckoutElements — Stripe.js side-effect regression guard', () => {
  // The default `@stripe/stripe-js` entry point schedules Stripe.js to
  // self-inject a <script> tag and fraud-detection <iframe> as a
  // module-load side effect, independent of whether `loadStripe()` is ever
  // called. Importing it anywhere in the app's dependency graph — including
  // composables only used behind auth — loads Stripe.js globally, which
  // triggered a WebKit bug (spurious file-download prompt) on the anonymous
  // /welcome marketing page. The `/pure` entry point has no such side
  // effect. This composable must keep importing from `/pure`.
  test('[obligation] never invokes the side-effecting default @stripe/stripe-js entry point', async () => {
    mockLoadStripe.mockResolvedValue(makeStripe())

    withSetup(baseOptions())
    await flushPromises()

    expect(mockLoadStripeSideEffecting).not.toHaveBeenCalled()
    expect(mockLoadStripe).toHaveBeenCalledTimes(1)
  })

  test('[obligation] imports loadStripe from the @stripe/stripe-js/pure entry point', () => {
    const source_path = resolve(process.cwd(), 'src/composables/billing/use-checkout-elements.ts')
    const source = readFileSync(source_path, 'utf-8')

    expect(source).toMatch(
      /import\s*\{\s*loadStripe\s*\}\s*from\s*['"]@stripe\/stripe-js\/pure['"]/
    )
  })
})

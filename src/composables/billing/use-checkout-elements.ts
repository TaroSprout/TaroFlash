import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import {
  loadStripe,
  type Stripe,
  type StripeCheckoutElementsSdk,
  type StripeCheckoutSession,
  type StripePaymentElement
} from '@stripe/stripe-js'
import { getStripeAppearance, STRIPE_FONTS } from '@/utils/billing/stripe-theme'
import logger from '@/utils/logger'

type UseCheckoutElementsOptions = {
  getClientSecret: () => Promise<string>
  publicKey: string
  genericErrorMessage: string
}

export type ConfirmOutcome =
  | { status: 'success'; session: StripeCheckoutSession }
  | { status: 'error'; message: string }

/**
 * Owns the generic embedded-Checkout-Elements lifecycle shared by the
 * subscription checkout and add-credit-card flows: load Stripe.js, init the
 * Checkout Elements SDK against a Checkout Session client_secret, mount a
 * Payment Element, and confirm on submit. Stays agnostic of subscription vs.
 * setup mode and of what the caller does with a successful session.
 */
export function useCheckoutElements(options: UseCheckoutElementsOptions) {
  const container_ref = useTemplateRef<HTMLDivElement>('container')

  const is_loading = ref(true)
  const is_submitting = ref(false)
  const is_ready = ref(false)
  const load_error = ref(false)
  const submit_error = ref<string | null>(null)

  let stripe: Stripe | null = null
  let checkout: StripeCheckoutElementsSdk | null = null
  let payment_element: StripePaymentElement | null = null

  onMounted(async () => {
    try {
      const [clientSecret, stripeInstance] = await Promise.all([
        options.getClientSecret(),
        loadStripe(options.publicKey)
      ])
      if (!stripeInstance) throw new Error('Stripe.js failed to load')
      stripe = stripeInstance

      checkout = stripe.initCheckoutElementsSdk({
        clientSecret,
        elementsOptions: { appearance: getStripeAppearance(), fonts: STRIPE_FONTS }
      })

      payment_element = checkout.createPaymentElement({ layout: 'tabs' })
      payment_element.on('ready', () => {
        is_ready.value = true
      })

      if (container_ref.value) payment_element.mount(container_ref.value)
    } catch (err) {
      logger.error((err as Error).message)
      load_error.value = true
    } finally {
      is_loading.value = false
    }
  })

  onBeforeUnmount(() => {
    payment_element?.destroy()
  })

  async function confirm(): Promise<ConfirmOutcome> {
    if (!checkout) return { status: 'error', message: options.genericErrorMessage }
    is_submitting.value = true
    submit_error.value = null

    const loadActionsResult = await checkout.loadActions()
    if (loadActionsResult.type === 'error') {
      submit_error.value = loadActionsResult.error.message ?? options.genericErrorMessage
      is_submitting.value = false
      return { status: 'error', message: submit_error.value }
    }

    // return_url is already set when the Checkout Session was created
    // server-side — Stripe rejects passing it again here.
    const result = await loadActionsResult.actions.confirm({ redirect: 'if_required' })
    is_submitting.value = false

    if (result.type === 'error') {
      submit_error.value = result.error.message ?? options.genericErrorMessage
      return { status: 'error', message: submit_error.value }
    }

    if (result.session.status.type !== 'complete') {
      submit_error.value = options.genericErrorMessage
      return { status: 'error', message: submit_error.value }
    }

    return { status: 'success', session: result.session }
  }

  return { container_ref, is_loading, is_submitting, is_ready, load_error, submit_error, confirm }
}

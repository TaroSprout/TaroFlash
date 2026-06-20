<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQueryCache } from '@pinia/colada'
import {
  loadStripe,
  type Stripe,
  type StripeElements,
  type StripePaymentElement
} from '@stripe/stripe-js'
import mobileSheet from '@/components/layout-kit/modal/mobile-sheet.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { useCreateSubscriptionMutation } from '@/api/billing'
import { getStripeAppearance, STRIPE_FONTS } from '@/utils/billing/stripe-theme'
import logger from '@/utils/logger'

export type CheckoutResponse = { upgraded: boolean }

const { close } = defineProps<{
  close: (response?: CheckoutResponse) => void
}>()

const { t } = useI18n()
const queryCache = useQueryCache()
const { mutateAsync: createSubscription } = useCreateSubscriptionMutation()

const container_ref = useTemplateRef<HTMLDivElement>('container')

const is_loading = ref(true)
const is_submitting = ref(false)
const is_ready = ref(false)
const load_error = ref(false)
const submit_error = ref<string | null>(null)

let stripe: Stripe | null = null
let elements: StripeElements | null = null
let payment_element: StripePaymentElement | null = null

onMounted(async () => {
  try {
    const [subscription, stripeInstance] = await Promise.all([
      createSubscription({ planId: 'paid' }),
      loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
    ])
    if (!stripeInstance) throw new Error('Stripe.js failed to load')
    stripe = stripeInstance

    elements = stripe.elements({
      clientSecret: subscription.clientSecret,
      appearance: getStripeAppearance(),
      fonts: STRIPE_FONTS
    })

    payment_element = elements.create('payment', { layout: 'tabs' })
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

async function onSubmit() {
  if (!stripe || !elements) return
  is_submitting.value = true
  submit_error.value = null

  const result = await stripe.confirmPayment({
    elements,
    confirmParams: {
      return_url: window.location.origin
    },
    redirect: 'if_required'
  })

  if (result.error) {
    submit_error.value = result.error.message ?? t('billing.checkout.submit-error')
    is_submitting.value = false
    return
  }

  if (result.paymentIntent?.status === 'succeeded') {
    queryCache.invalidateQueries({ key: ['member'] })
    close({ upgraded: true })
    return
  }

  submit_error.value = t('billing.checkout.submit-error')
  is_submitting.value = false
}
</script>

<template>
  <mobile-sheet
    data-testid="checkout"
    class="sm:max-w-130! max-h-[95dvh]"
    :title="t('billing.checkout.title')"
    data-theme="green-400"
    @close="close()"
  >
    <div
      data-testid="checkout__body"
      class="overflow-y-auto max-h-[65dvh] px-6 pb-2 flex flex-col gap-4"
    >
      <p v-if="is_loading" data-testid="checkout__loading" class="text-brown-700 py-10 text-center">
        {{ t('billing.checkout.loading') }}
      </p>
      <p
        v-else-if="load_error"
        data-testid="checkout__error"
        class="py-10 text-center text-red-500"
      >
        {{ t('billing.checkout.error') }}
      </p>
      <div ref="container" data-testid="checkout__payment-element"></div>
      <p v-if="submit_error" data-testid="checkout__submit-error" class="text-sm text-red-500">
        {{ submit_error }}
      </p>
    </div>

    <template #footer>
      <div v-if="!is_loading && !load_error" data-testid="checkout__footer" class="px-6 pb-6 pt-2">
        <ui-button
          data-testid="checkout__submit"
          data-theme="green-400"
          full-width
          size="lg"
          :loading="is_submitting"
          :disabled="!is_ready"
          @press="onSubmit"
        >
          {{ t('billing.checkout.submit') }}
        </ui-button>
      </div>
    </template>
  </mobile-sheet>
</template>

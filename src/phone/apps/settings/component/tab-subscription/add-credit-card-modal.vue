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
import { useCreateSetupIntentMutation } from '@/api/billing'
import { getStripeAppearance, STRIPE_FONTS } from '@/utils/billing/stripe-theme'
import logger from '@/utils/logger'

export type AddCreditCardResponse = { added: boolean; paymentMethodId: string | null }

const { close } = defineProps<{
  close: (response?: AddCreditCardResponse) => void
}>()

const { t } = useI18n()
const queryCache = useQueryCache()
const { mutateAsync: createSetupIntent } = useCreateSetupIntentMutation()

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
    const [setup, stripeInstance] = await Promise.all([
      createSetupIntent(),
      loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
    ])
    if (!stripeInstance) throw new Error('Stripe.js failed to load')
    stripe = stripeInstance

    elements = stripe.elements({
      clientSecret: setup.clientSecret,
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

  const result = await stripe.confirmSetup({
    elements,
    confirmParams: {
      return_url: window.location.origin
    },
    redirect: 'if_required'
  })

  if (result.error) {
    submit_error.value =
      result.error.message ?? t('settings.subscription.add-credit-card.submit-error')
    is_submitting.value = false
    return
  }

  if (result.setupIntent?.status === 'succeeded') {
    queryCache.invalidateQueries({ key: ['billing', 'payment-methods'] })
    const pm = result.setupIntent.payment_method
    const paymentMethodId = typeof pm === 'string' ? pm : (pm?.id ?? null)
    close({ added: true, paymentMethodId })
    return
  }

  submit_error.value = t('settings.subscription.add-credit-card.submit-error')
  is_submitting.value = false
}
</script>

<template>
  <mobile-sheet
    data-testid="add-credit-card-modal"
    class="sm:max-w-130! max-h-[95dvh]"
    :title="t('settings.subscription.add-credit-card.title')"
    data-theme="green-400"
    @close="close()"
  >
    <div
      data-testid="add-credit-card-modal__body"
      class="overflow-y-auto max-h-[65dvh] px-6 pb-2 flex flex-col gap-4"
    >
      <p
        v-if="is_loading"
        data-testid="add-credit-card-modal__loading"
        class="text-brown-700 py-10 text-center"
      >
        {{ t('settings.subscription.add-credit-card.loading') }}
      </p>
      <p
        v-else-if="load_error"
        data-testid="add-credit-card-modal__error"
        class="py-10 text-center text-red-500"
      >
        {{ t('settings.subscription.add-credit-card.error') }}
      </p>
      <div ref="container" data-testid="add-credit-card-modal__payment-element"></div>
      <p
        v-if="submit_error"
        data-testid="add-credit-card-modal__submit-error"
        class="text-sm text-red-500"
      >
        {{ submit_error }}
      </p>
    </div>

    <template #footer>
      <div
        v-if="!is_loading && !load_error"
        data-testid="add-credit-card-modal__footer"
        class="px-6 pb-6 pt-2"
      >
        <ui-button
          data-testid="add-credit-card-modal__submit"
          data-theme="green-400"
          full-width
          size="lg"
          :loading="is_submitting"
          :disabled="!is_ready"
          @press="onSubmit"
        >
          {{ t('settings.subscription.add-credit-card.submit') }}
        </ui-button>
      </div>
    </template>
  </mobile-sheet>
</template>

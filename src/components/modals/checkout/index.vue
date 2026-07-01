<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import CrossfadeResize from '@/components/layout-kit/crossfade-resize.vue'
import UiButton from '@/components/ui-kit/button.vue'
import PaymentStatus from './payment-status.vue'
import SuccessView from './success-view.vue'
import CheckoutFooter from './checkout-footer.vue'
import { useCheckout, type CheckoutResponse } from './use-checkout'

export type { CheckoutResponse }

const { close } = defineProps<{
  close: (response?: CheckoutResponse) => void
}>()

const { t } = useI18n()
const { status, is_ready, submit_error, onSubmit, onDone } = useCheckout(close)
</script>

<template>
  <div
    data-testid="checkout"
    class="h-160 w-150 relative flex flex-col justify-between overflow-hidden rounded-8 bg-brown-100 shadow-lg py-6 dark:bg-grey-800"
  >
    <header
      data-testid="checkout__header"
      class="w-full shrink-0 grid grid-cols-[1fr_auto_1fr] px-6"
    >
      <ui-button
        data-testid="checkout__close"
        data-theme="brown-300"
        data-theme-dark="stone-700"
        icon-left="close"
        icon-only
        rounded-full
        class="justify-self-start"
        @press="close()"
      >
        {{ t('billing.checkout.close-label') }}
      </ui-button>

      <h1 data-testid="checkout__title" class="text-4xl text-brown-700 dark:text-brown-100">
        {{ t('billing.checkout.title') }}
      </h1>
    </header>

    <crossfade-resize data-testid="checkout__body-swap" class="px-16">
      <div
        v-if="status !== 'success'"
        key="form"
        data-testid="checkout__body"
        class="flex flex-col gap-4"
      >
        <payment-status :status="status" />
        <div ref="container" data-testid="checkout__payment-element"></div>
        <p v-if="submit_error" data-testid="checkout__submit-error" class="text-sm text-red-500">
          {{ submit_error }}
        </p>
      </div>

      <success-view v-else key="success" />
    </crossfade-resize>

    <checkout-footer
      class="px-16"
      :status="status"
      :is_ready="is_ready"
      @submit="onSubmit"
      @done="onDone"
    />
  </div>
</template>

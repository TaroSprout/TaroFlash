<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import PaymentStatus from './payment-status.vue'
import SuccessView from './success-view.vue'
import CheckoutFooter from './checkout-footer.vue'
import { useCheckout, type CheckoutResponse } from './use-checkout'
import { fadeLeave } from '@/utils/animations/fade'
import { springScaleIn } from '@/utils/animations/modal'
import { useMatchMedia } from '@/composables/ui/media-query'

export type { CheckoutResponse }

const { close } = defineProps<{
  close: (response?: CheckoutResponse) => void
}>()

const { t } = useI18n()
const { status, is_ready, submit_error, onSubmit } = useCheckout(close)
const is_mobile = useMatchMedia('w<sm')

function onLeave(el: Element, done: () => void) {
  fadeLeave(el, done)
}

function onEnter(el: Element, done: () => void) {
  springScaleIn(el, done)
}
</script>

<template>
  <div
    data-testid="checkout"
    class="relative flex flex-col overflow-hidden bg-brown-100 py-6 dark:bg-grey-800"
    :class="[
      is_mobile ? 'h-full w-full rounded-none' : 'h-160 w-150 rounded-8 shadow-lg',
      status === 'success' ? 'justify-center' : 'justify-between'
    ]"
  >
    <header
      v-if="status !== 'success'"
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
        :disabled="status === 'confirming'"
        @press="close()"
      >
        {{ t('billing.checkout.close-label') }}
      </ui-button>

      <h1 data-testid="checkout__title" class="text-4xl text-brown-700 dark:text-brown-100">
        {{ t('billing.checkout.title') }}
      </h1>
    </header>

    <transition :css="false" mode="out-in" @leave="onLeave" @enter="onEnter">
      <div
        v-if="status !== 'success'"
        key="form"
        data-testid="checkout__body"
        class="flex flex-col gap-4 px-16"
      >
        <payment-status :status="status" />
        <div ref="container" data-testid="checkout__payment-element"></div>
        <p v-if="submit_error" data-testid="checkout__submit-error" class="text-sm text-red-500">
          {{ submit_error }}
        </p>
      </div>

      <success-view v-else key="success" />
    </transition>

    <checkout-footer
      v-if="status !== 'success'"
      class="px-16"
      :status="status"
      :is_ready="is_ready"
      @submit="onSubmit"
    />
  </div>
</template>

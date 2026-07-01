<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import mobileSheet from '@/components/layout-kit/modal/mobile-sheet.vue'
import CrossfadeResize from '@/components/layout-kit/crossfade-resize.vue'
import PaymentStatus from './payment-status.vue'
import SuccessView from './success-view.vue'
import CheckoutFooter from './checkout-footer.vue'
import { useCheckout, type CheckoutResponse } from './use-checkout'

export type { CheckoutResponse }

const { close } = defineProps<{
  close: (response?: CheckoutResponse) => void
}>()

const { t } = useI18n()
const {
  is_loading,
  is_submitting,
  is_ready,
  load_error,
  submit_error,
  is_success,
  onSubmit,
  onDone
} = useCheckout(close)
</script>

<template>
  <mobile-sheet
    data-testid="checkout"
    class="sm:max-w-150! sm:h-150"
    :title="t('billing.checkout.title')"
    sheet_px="4.5rem"
    data-theme="green-400"
    @close="close()"
  >
    <crossfade-resize data-testid="checkout__body-swap">
      <div
        v-if="!is_success"
        key="form"
        data-testid="checkout__body"
        class="overflow-y-auto max-h-[65dvh] px-(--sheet-px) pb-2 flex flex-col gap-4"
      >
        <payment-status :is_loading="is_loading" :load_error="load_error" />
        <div ref="container" data-testid="checkout__payment-element"></div>
        <p v-if="submit_error" data-testid="checkout__submit-error" class="text-sm text-red-500">
          {{ submit_error }}
        </p>
      </div>

      <success-view v-else key="success" />
    </crossfade-resize>

    <checkout-footer
      :is_loading="is_loading"
      :load_error="load_error"
      :is_success="is_success"
      :is_submitting="is_submitting"
      :is_ready="is_ready"
      @submit="onSubmit"
      @done="onDone"
    />
  </mobile-sheet>
</template>

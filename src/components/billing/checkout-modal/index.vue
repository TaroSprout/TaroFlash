<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import DialogCard from '@/components/layout-kit/dialog-card/index.vue'
import DialogCardPager from '@/components/layout-kit/dialog-card/dialog-card-pager.vue'
import DialogCardBody from '@/components/layout-kit/dialog-card/dialog-card-body.vue'
import PaymentStatus from './payment-status.vue'
import SuccessView from './success-view.vue'
import CheckoutFooter from './checkout-footer.vue'
import { useCheckout, type CheckoutResponse } from './use-checkout'

export type { CheckoutResponse }

const { close } = defineProps<{
  close: (response?: CheckoutResponse) => void
}>()

const { t } = useI18n()
const { status, is_ready, onSubmit } = useCheckout(close)
</script>

<template>
  <dialog-card
    data-testid="checkout"
    size="md"
    :title="t('billing.checkout.title')"
    :show_header="status !== 'success'"
    :close_label="t('billing.checkout.close-label')"
    :close_disabled="status === 'confirming'"
    @close="close()"
  >
    <dialog-card-body data-testid="checkout__scroll-area">
      <div
        data-testid="checkout__pane"
        class="flex flex-1 flex-col gap-4 pt-4"
        :class="status === 'success' ? 'justify-center' : ''"
      >
        <dialog-card-pager mode="out-in">
          <div
            v-if="status !== 'success'"
            key="form"
            data-testid="checkout__body"
            class="flex flex-col gap-4"
          >
            <payment-status :status="status" />
            <div ref="container" data-testid="checkout__payment-element"></div>
          </div>

          <success-view v-else key="success" />
        </dialog-card-pager>
      </div>
    </dialog-card-body>

    <template v-if="status !== 'success'" #toolbar>
      <checkout-footer :status="status" :is_ready="is_ready" @submit="onSubmit" />
    </template>
  </dialog-card>
</template>

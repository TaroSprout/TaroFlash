<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import DialogCard from '@/components/layout-kit/dialog-card/index.vue'
import DialogCardPager from '@/components/layout-kit/dialog-card/dialog-card-pager.vue'
import ScrollBar from '@/components/ui-kit/scroll-bar.vue'
import PaymentStatus from './payment-status.vue'
import SuccessView from './success-view.vue'
import CheckoutFooter from './checkout-footer.vue'
import { useCheckout, type CheckoutResponse } from './use-checkout'
import { useOverlayContext } from '@/composables/overlay/overlay-context'

export type { CheckoutResponse }

const { t } = useI18n()
const { close } = useOverlayContext()
const { status, is_ready, onSubmit } = useCheckout(close)
</script>

<template>
  <dialog-card
    data-testid="checkout"
    class="pb-6"
    size="md"
    :title="t('billing.checkout.title')"
    :show_header="status !== 'success'"
    :close_label="t('billing.checkout.close-label')"
    :close_disabled="status === 'confirming'"
  >
    <template #default="{ is_downgraded }">
      <div
        data-testid="checkout__scroll-area"
        :data-full-bleed="is_downgraded"
        class="flex min-h-0 flex-1 flex-col gap-4 h-full pt-4"
        :class="[
          status === 'success' ? 'justify-center' : 'justify-between',
          is_downgraded ? 'overflow-y-auto scroll-hidden' : ''
        ]"
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

        <checkout-footer
          v-if="status !== 'success'"
          :status="status"
          :is_ready="is_ready"
          @submit="onSubmit"
        />
      </div>

      <scroll-bar
        v-if="is_downgraded"
        target="[data-testid='checkout__scroll-area']"
        min-width="sm"
        class="absolute right-8 top-6 bottom-6"
      />
    </template>
  </dialog-card>
</template>

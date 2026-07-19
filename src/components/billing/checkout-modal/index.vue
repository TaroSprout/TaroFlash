<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import DialogCard from '@/components/layout-kit/dialog-card/index.vue'
import DialogCardPager from '@/components/layout-kit/dialog-card/dialog-card-pager.vue'
import ScrollBar from '@/components/ui-kit/scroll-bar.vue'
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
    class="pb-6"
    size="md"
    :title="t('billing.checkout.title')"
    :show_header="status !== 'success'"
    :close_label="t('billing.checkout.close-label')"
    :close_disabled="status === 'confirming'"
    @close="close()"
  >
    <template #default="{ viewport }">
      <div
        data-testid="checkout__scroll-area"
        :data-full-bleed="viewport === 'mobile'"
        class="flex min-h-0 flex-1 flex-col gap-4 h-full pt-4"
        :class="[
          status === 'success' ? 'justify-center' : 'justify-between',
          viewport === 'mobile' ? 'overflow-y-auto scroll-hidden' : ''
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
        v-if="viewport === 'mobile'"
        target="[data-testid='checkout__scroll-area']"
        min-width="sm"
        class="absolute right-8 top-6 bottom-6"
      />
    </template>
  </dialog-card>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import DialogCard from '@/components/layout-kit/dialog-card/dialog-card.vue'
import DialogCardHeader from '@/components/layout-kit/dialog-card/dialog-card-header.vue'
import UiButton from '@/components/ui-kit/button.vue'
import ScrollBar from '@/components/ui-kit/scroll-bar.vue'
import PaymentStatus from './payment-status.vue'
import SuccessView from './success-view.vue'
import CheckoutFooter from './checkout-footer.vue'
import { useCheckout, type CheckoutResponse } from './use-checkout'
import { fadeLeave } from '@/utils/animations/fade'
import { springScaleIn } from '@/utils/animations/modal'

export type { CheckoutResponse }

const { close } = defineProps<{
  close: (response?: CheckoutResponse) => void
}>()

const { t } = useI18n()
const { status, is_ready, onSubmit } = useCheckout(close)

function onLeave(el: Element, done: () => void) {
  fadeLeave(el, done)
}

function onEnter(el: Element, done: () => void) {
  springScaleIn(el, done)
}
</script>

<template>
  <dialog-card
    data-testid="checkout"
    class="h-160 w-150 bg-brown-100 pb-6 dark:bg-grey-800"
    data-theme="brown-300"
    data-theme-dark="stone-700"
    :show_close_button="false"
    @close="close()"
  >
    <template #default="{ viewport }">
      <div
        data-testid="checkout__scroll-area"
        :data-full-bleed="viewport === 'mobile'"
        class="flex min-h-0 flex-1 flex-col gap-4 h-full"
        :class="[
          status === 'success' ? 'justify-center' : 'justify-between',
          viewport === 'mobile' ? 'overflow-y-auto scroll-hidden' : ''
        ]"
      >
        <dialog-card-header
          v-if="status !== 'success'"
          data-testid="checkout__header"
          :title="t('billing.checkout.title')"
        >
          <template #start>
            <ui-button
              data-testid="checkout__close"
              icon-left="close"
              icon-only
              rounded-full
              :disabled="status === 'confirming'"
              @press="close()"
            >
              {{ t('billing.checkout.close-label') }}
            </ui-button>
          </template>
        </dialog-card-header>

        <transition :css="false" mode="out-in" @leave="onLeave" @enter="onEnter">
          <div
            v-if="status !== 'success'"
            key="form"
            data-testid="checkout__body"
            class="flex flex-col gap-4 px-(--dialog-px)"
          >
            <payment-status :status="status" />
            <div ref="container" data-testid="checkout__payment-element"></div>
          </div>

          <success-view v-else key="success" />
        </transition>

        <checkout-footer
          v-if="status !== 'success'"
          class="px-(--dialog-px)"
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

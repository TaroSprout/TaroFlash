<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import type { CheckoutStatus } from './use-checkout'

type CheckoutFooterProps = {
  status: CheckoutStatus
  is_ready: boolean
}

const { status, is_ready } = defineProps<CheckoutFooterProps>()

const emit = defineEmits<{
  (e: 'submit'): void
  (e: 'done'): void
}>()

const { t } = useI18n()
</script>

<template>
  <div
    data-testid="checkout__footer"
    class="shrink-0 px-(--checkout-padding) pb-(--checkout-padding) pt-2"
  >
    <ui-button
      v-if="status === 'form' || status === 'confirming'"
      data-testid="checkout__submit"
      data-theme="green-400"
      full-width
      size="lg"
      :loading="status === 'confirming'"
      :disabled="!is_ready"
      @press="emit('submit')"
    >
      {{ t('billing.checkout.submit') }}
    </ui-button>
    <ui-button
      v-else-if="status === 'success'"
      data-testid="checkout__success-close"
      data-theme="green-400"
      full-width
      size="lg"
      @press="emit('done')"
    >
      {{ t('billing.checkout.success-close') }}
    </ui-button>
  </div>
</template>

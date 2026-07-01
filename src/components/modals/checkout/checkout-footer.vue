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
}>()

const { t } = useI18n()
</script>

<template>
  <div
    data-testid="checkout__footer"
    class="shrink-0 px-(--checkout-padding) pb-(--checkout-padding) pt-2"
  >
    <ui-button
      data-testid="checkout__submit"
      data-theme="green-400"
      full-width
      size="lg"
      :loading="status === 'loading' || status === 'confirming'"
      :disabled="!is_ready || status === 'error'"
      @press="emit('submit')"
    >
      {{ t('billing.checkout.submit') }}
    </ui-button>
  </div>
</template>

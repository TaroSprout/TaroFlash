<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { CheckoutStatus } from './use-checkout'

type PaymentStatusProps = {
  status: CheckoutStatus
}

const { status } = defineProps<PaymentStatusProps>()

const { t } = useI18n()
</script>

<template>
  <p
    v-if="status === 'loading'"
    data-testid="checkout__loading"
    class="text-brown-700 dark:text-brown-100 py-10 text-center"
  >
    {{ t('billing.checkout.loading') }}
  </p>
  <p
    v-else-if="status === 'error'"
    data-testid="checkout__error"
    class="py-10 text-center text-red-500 dark:text-red-600"
  >
    {{ t('billing.checkout.error') }}
  </p>
</template>

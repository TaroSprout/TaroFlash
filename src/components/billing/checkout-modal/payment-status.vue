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
  <p v-if="status === 'loading'" data-testid="checkout__loading" class="text-ink py-10 text-center">
    {{ t('billing.checkout.loading') }}
  </p>
  <p
    v-else-if="status === 'error'"
    data-testid="checkout__error"
    data-palette="danger"
    class="py-10 text-center text-(--color-accent)"
  >
    {{ t('billing.checkout.error') }}
  </p>
</template>

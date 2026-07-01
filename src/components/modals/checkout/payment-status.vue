<script setup lang="ts">
import { useI18n } from 'vue-i18n'

type PaymentStatusProps = {
  is_loading: boolean
  load_error: boolean
}

const { is_loading, load_error } = defineProps<PaymentStatusProps>()

const { t } = useI18n()
</script>

<template>
  <p v-if="is_loading" data-testid="checkout__loading" class="text-brown-700 py-10 text-center">
    {{ t('billing.checkout.loading') }}
  </p>
  <p v-else-if="load_error" data-testid="checkout__error" class="py-10 text-center text-red-500">
    {{ t('billing.checkout.error') }}
  </p>
</template>

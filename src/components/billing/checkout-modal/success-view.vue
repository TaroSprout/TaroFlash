<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'

const { t } = useI18n()
</script>

<template>
  <div
    data-testid="checkout__success"
    class="flex flex-col items-center gap-3 px-(--checkout-padding) py-10 text-center"
  >
    <ui-icon src="party-popper" class="size-18 text-blue-500" />
    <h2 data-testid="checkout__success-heading" class="text-2xl text-ink">
      {{ t('billing.checkout.success-heading') }}
    </h2>
    <p data-testid="checkout__success-message" class="text-ink-muted">
      {{ t('billing.checkout.success-message') }}
    </p>
  </div>
</template>

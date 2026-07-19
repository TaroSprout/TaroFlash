<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'

const { t } = useI18n()
</script>

<template>
  <div
    data-testid="reset-password-modal__success"
    class="h-full flex flex-col items-center justify-center gap-4 text-center"
  >
    <ui-icon src="party-popper" class="size-18 text-blue-500" />
    <h2 data-testid="reset-password-modal__success-heading" class="text-2xl text-ink">
      {{ t('reset-password-modal.success-heading') }}
    </h2>
    <p data-testid="reset-password-modal__success-message" class="text-ink-muted">
      {{ t('reset-password-modal.success-message') }}
    </p>
  </div>
</template>

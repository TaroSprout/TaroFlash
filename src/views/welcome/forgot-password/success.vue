<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { emitSfx } from '@/sfx/bus'

defineProps<{ close: () => void }>()

const { t } = useI18n()

onMounted(() => emitSfx('success_1'))
</script>

<template>
  <div
    data-testid="forgot-password-modal__success"
    class="h-full flex flex-col items-center justify-center gap-4 text-center"
  >
    <ui-icon src="send" class="size-12 text-ink" />

    <div class="flex flex-col gap-2">
      <p class="text-xl text-ink">
        {{ t('forgot-password-modal.success-heading') }}
      </p>
      <p class="text-ink-muted">
        {{ t('forgot-password-modal.success-message') }}
      </p>
    </div>

    <ui-button
      data-testid="forgot-password-modal__success-close"
      data-theme="brown-50"
      data-theme-dark="stone-700"
      size="xl"
      full-width
      :sfx="{ press: 'snappy_button_5' }"
      @press="close"
    >
      {{ t('dialog-card.close-label') }}
    </ui-button>
  </div>
</template>

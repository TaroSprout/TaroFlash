<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { emitSfx } from '@/sfx/bus'

defineProps<{
  icon: string
  heading: string
  message: string
  close: () => void
}>()

const { t } = useI18n()

onMounted(() => emitSfx('success_1'))
</script>

<template>
  <div class="h-full flex flex-col items-center justify-center text-center gap-6">
    <ui-icon :src="icon" class="size-12 text-ink" />

    <div class="flex flex-col gap-2">
      <p class="text-xl text-ink">{{ heading }}</p>
      <p class="text-ink-muted">{{ message }}</p>
    </div>

    <ui-button
      neutral
      data-testid="account-access-success-panel__close"
      size="xl"
      full-width
      :sfx="{ press: 'snappy_button_5' }"
      @press="close"
    >
      {{ t('dialog-card.close-label') }}
    </ui-button>
  </div>
</template>

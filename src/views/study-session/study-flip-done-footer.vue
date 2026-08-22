<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'

const emit = defineEmits<{
  (e: 'flip'): void
  (e: 'done'): void
}>()

const { t } = useI18n()
</script>

<template>
  <div data-testid="study-flip-done-footer" class="mx-auto flex w-full max-w-95 gap-2">
    <ui-button
      neutral
      data-testid="study-flip-done-footer__flip"
      full-width
      size="xl"
      @press="emit('flip')"
    >
      {{ t('study.flashcard.edit-footer.flip-button') }}
    </ui-button>

    <ui-button
      data-testid="study-flip-done-footer__done"
      full-width
      size="xl"
      :sfx="{ press: 'card.saved' }"
      @press="emit('done')"
    >
      {{ t('study-session.edit.done') }}
    </ui-button>
  </div>
</template>

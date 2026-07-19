<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import { mobileCardEditorKey } from './use-mobile-card-editor'

const { t } = useI18n()

const { has_prev, has_next, flip, prev, next } = inject(mobileCardEditorKey)!
</script>

<template>
  <div
    data-testid="mobile-card-editor__controls"
    class="flex w-full items-center justify-between gap-2"
  >
    <ui-button
      neutral
      data-testid="mobile-card-editor__prev"
      icon-only
      icon-left="chevron-left"
      size="xl"
      :disabled="!has_prev"
      :sfx="{ press: 'transition_down' }"
      @press="prev"
    >
      {{ t('deck-view.mobile-editor.prev-button') }}
    </ui-button>

    <ui-button
      data-testid="mobile-card-editor__flip"
      data-theme="blue-500"
      data-theme-dark="blue-650"
      icon-left="card-flip"
      full-width
      size="xl"
      :sfx="{ tap_pre: 'snappy_button_5' }"
      @press="flip"
    >
      {{ t('deck-view.mobile-editor.flip-button') }}
    </ui-button>

    <ui-button
      neutral
      data-testid="mobile-card-editor__next"
      icon-only
      icon-left="chevron-right"
      size="xl"
      :disabled="!has_next"
      :sfx="{ press: 'transition_up' }"
      @press="next"
    >
      {{ t('deck-view.mobile-editor.next-button') }}
    </ui-button>
  </div>
</template>

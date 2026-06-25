<script setup lang="ts">
import UiButton from '@/components/ui-kit/button.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div
    data-testid="deck-footer-actions"
    class="flex w-full items-center gap-2 px-(--dock-px) py-(--dock-py)"
  >
    <ui-button
      data-testid="deck-footer-actions__search"
      icon-only
      icon-left="search"
      data-theme="brown-200"
      data-theme-dark="stone-700"
      size="lg"
    >
      {{ t('deck-view.mobile-footer.search') }}
    </ui-button>

    <ui-button
      data-testid="deck-footer-actions__view-options"
      icon-only
      icon-left="page-setting"
      data-theme="brown-200"
      data-theme-dark="stone-700"
      size="lg"
    >
      {{ t('deck-view.mobile-footer.view-options') }}
    </ui-button>

    <ui-button
      data-testid="deck-footer-actions__new-card"
      icon-left="add"
      data-theme="blue-500"
      data-theme-dark="blue-650"
      size="lg"
      class="ml-auto"
    >
      {{ t('deck-view.mobile-footer.new-card') }}
    </ui-button>
  </div>
</template>

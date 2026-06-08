<script setup lang="ts">
import UiTag from '@/components/ui-kit/tag.vue'
import { useI18n } from 'vue-i18n'
import { inject } from 'vue'
import { type CardListController } from '@/composables/card-editor/card-list-controller'

const { t } = useI18n()

const { card_count } = inject<CardListController>('card-editor')!
</script>

<template>
  <ui-tag
    data-testid="card-count"
    data-theme="green-400"
    data-theme-dark="green-800"
    class="bgx-diagonal-stripes bgx-opacity-10"
  >
    {{ t('deck-view.card-count.label', card_count) }}
  </ui-tag>
</template>

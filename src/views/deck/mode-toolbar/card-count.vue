<script setup lang="ts">
import UiTag from '@/components/ui-kit/tag.vue'
import { useI18n } from 'vue-i18n'
import { inject } from 'vue'
import { cardEditorKey } from '@/views/deck/composables'

const { t } = useI18n()

const { card_count } = inject(cardEditorKey)!
</script>

<template>
  <ui-tag
    data-testid="card-count"
    data-palette="green"
    fill-height
    class="bgx-diagonal-stripes bgx-opacity-10"
  >
    {{ t('deck-view.card-count.label', card_count) }}
  </ui-tag>
</template>

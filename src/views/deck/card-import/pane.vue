<script setup lang="ts">
import CardGridEmpty from '@/views/deck/card-grid/empty-state.vue'
import PreviewGrid from './preview-grid.vue'
import PreviewList from './preview-list.vue'
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMatchMedia } from '@/composables/ui/media-query'
import { cardImportKey } from '@/views/deck/composables/card-import'

const { t } = useI18n()

const { has_cards, layout } = inject(cardImportKey)!

// A narrow screen offers no layout choice, so the preview is always a grid there.
const is_mobile = useMatchMedia('w<md')

const preview = computed(() =>
  layout.value === 'list' && !is_mobile.value ? PreviewList : PreviewGrid
)
</script>

<template>
  <div data-testid="card-import-pane" class="w-full">
    <div
      v-if="!has_cards"
      data-testid="card-import-pane__empty-wrap"
      class="flex flex-col xl:h-[calc(100dvh-var(--nav-height))]"
    >
      <card-grid-empty
        data-testid="card-import-pane__empty"
        icon="card-place"
        :show_button="false"
        :message="t('deck-view.card-import.empty-preview')"
      />
    </div>

    <component :is="preview" v-else />
  </div>
</template>

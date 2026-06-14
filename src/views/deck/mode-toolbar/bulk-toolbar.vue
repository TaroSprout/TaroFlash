<script setup lang="ts">
import toolbarBase from './toolbar-base.vue'
import CardCount from './card-count.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiTag from '@/components/ui-kit/tag.vue'
import { useI18n } from 'vue-i18n'
import { useBulkActions } from '@/composables/card/bulk-actions'

const { t } = useI18n()

const { selected_count, onCancel } = useBulkActions()
</script>

<template>
  <toolbar-base data-testid="bulk-toolbar">
    <template #left>
      <ui-button
        data-testid="bulk-toolbar__cancel"
        data-theme="brown-300"
        data-theme-dark="stone-700"
        size="sm"
        icon-left="close"
        icon-only
        @click="onCancel"
      >
        {{ t('deck-view.bulk-toolbar.cancel') }}
      </ui-button>

      <ui-tag
        data-testid="bulk-toolbar__count"
        data-theme="purple-500"
        data-theme-dark="purple-800"
        notch-side="left"
        class="bgx-diagonal-stripes bgx-opacity-10"
      >
        {{ t('deck-view.bulk-toolbar.count', { count: selected_count }) }}
      </ui-tag>
    </template>

    <template #right>
      <card-count />
    </template>
  </toolbar-base>
</template>

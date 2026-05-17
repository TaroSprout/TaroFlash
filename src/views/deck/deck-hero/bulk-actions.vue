<script setup lang="ts">
import UiButton from '@/components/ui-kit/button.vue'
import UiTag from '@/components/ui-kit/tag.vue'
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { type CardListController } from '@/composables/card-editor/card-list-controller'

const { t } = useI18n()

const { selection, actions } = inject<CardListController>('card-editor')!
const { selected_count, all_cards_selected, select_all_mode } = selection

const has_selection = computed(() => select_all_mode.value || selected_count.value > 0)

const select_all_label = computed(() =>
  all_cards_selected.value
    ? t('deck-view.bulk-toolbar.deselect-all')
    : t('deck-view.bulk-toolbar.select-all')
)
</script>

<template>
  <div data-testid="bulk-actions" class="flex flex-col gap-2 w-full">
    <div class="flex items-center justify-between">
      <ui-tag
        data-testid="bulk-actions__count"
        data-theme="purple-500"
        data-theme-dark="purple-800"
      >
        {{ t('deck-view.bulk-toolbar.count', { count: selected_count }) }}
      </ui-tag>

      <ui-button
        data-testid="bulk-actions__exit"
        data-theme="brown-300"
        data-theme-dark="stone-700"
        size="sm"
        icon-left="close"
        icon-only
        @click="selection.exitSelection()"
      >
        {{ t('deck-view.bulk-toolbar.exit') }}
      </ui-button>
    </div>

    <ui-button
      data-testid="bulk-actions__select-all"
      data-theme="brown-300"
      data-theme-dark="stone-700"
      full-width
      size="xl"
      :icon-left="all_cards_selected ? 'check-box' : 'check-box-outline-blank'"
      @click="selection.toggleSelectAll()"
    >
      {{ select_all_label }}
    </ui-button>

    <ui-button
      data-testid="bulk-actions__move"
      data-theme="blue-500"
      data-theme-dark="blue-650"
      full-width
      size="xl"
      icon-left="move-item"
      :disabled="!has_selection"
      @click="actions.onMoveCards()"
    >
      {{ t('deck-view.bulk-toolbar.move') }}
    </ui-button>

    <ui-button
      data-testid="bulk-actions__delete"
      data-theme="red-500"
      data-theme-dark="red-700"
      full-width
      size="xl"
      icon-left="delete"
      :disabled="!has_selection"
      @click="actions.onDeleteCards()"
    >
      {{ t('deck-view.bulk-toolbar.delete') }}
    </ui-button>
  </div>
</template>

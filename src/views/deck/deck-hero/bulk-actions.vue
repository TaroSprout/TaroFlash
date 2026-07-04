<script setup lang="ts">
import ToolbarBase from '@/views/deck/mode-toolbar/toolbar-base.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiTag from '@/components/ui-kit/tag.vue'
import UiNavList, { type NavListEntry } from '@/components/ui-kit/nav-list.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBulkActions } from '@/views/deck/composables'

const { t } = useI18n()

const {
  actions,
  selection,
  all_cards_selected,
  has_selection,
  select_all_label,
  onToggleSelectAll,
  onCancel
} = useBulkActions()

const nav_entries = computed<NavListEntry[]>(() => [
  {
    value: 'select-all',
    label: select_all_label.value,
    trailingIcon: all_cards_selected.value ? 'close-window-remove' : 'data-check'
  },
  {
    value: 'move',
    label: t('deck-view.bulk-actions.move-deck'),
    trailingIcon: 'move-item'
  }
])

function onNavigate(value: string) {
  if (value === 'select-all') onToggleSelectAll()
  else if (value === 'move') actions.onMoveCards()
}
</script>

<template>
  <div data-testid="bulk-actions" class="flex w-full flex-col gap-2">
    <toolbar-base>
      <template #left>
        <ui-button
          data-testid="bulk-actions__cancel"
          data-theme="brown-300"
          data-theme-dark="stone-700"
          icon-only
          icon-left="close"
          @press="onCancel"
        >
          {{ t('deck-view.bulk-actions.cancel') }}
        </ui-button>
      </template>

      <template #right>
        <ui-tag
          data-testid="bulk-actions__count"
          data-theme="purple-500"
          data-theme-dark="purple-700"
          fill-height
          class="bgx-diagonal-stripes bgx-opacity-10"
        >
          {{ t('deck-view.bulk-actions.count', { count: selection.selected_count.value }) }}
        </ui-tag>
      </template>
    </toolbar-base>

    <ui-nav-list :entries="nav_entries" size="lg" @navigate="onNavigate" />

    <ui-button
      data-testid="bulk-actions__delete"
      data-theme="red-500"
      data-theme-dark="red-600"
      full-width
      size="xl"
      :disabled="!has_selection"
      @press="actions.onDeleteCards()"
    >
      {{ t('deck-view.bulk-actions.delete-prefix') }}
      <span class="bg-brown-100 px-1 py-0.5 -rotate-5 rounded-1.5 text-red-500 dark:text-red-700">
        {{ selection.selected_count.value }}
      </span>
      {{ t('deck-view.bulk-actions.delete-cards-label', selection.selected_count.value) }}
    </ui-button>
  </div>
</template>

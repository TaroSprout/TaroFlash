<script setup lang="ts">
import toolbarBase from './toolbar-base.vue'
import Pager from './pager.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiTag from '@/components/ui-kit/tag.vue'
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { emitSfx } from '@/sfx/bus'
import { type CardListController } from '@/composables/card-editor/card-list-controller'

const { t } = useI18n()

const { selection } = inject<CardListController>('card-editor')!
const { selected_count } = selection

function onExit() {
  emitSfx('ui.digi_powerdown')
  selection.exitSelection()
}
</script>

<template>
  <toolbar-base data-testid="bulk-toolbar">
    <template #left>
      <ui-button
        data-testid="bulk-toolbar__exit"
        data-theme="brown-300"
        data-theme-dark="stone-700"
        size="sm"
        icon-left="close"
        icon-only
        @click="onExit"
      >
        {{ t('deck-view.bulk-toolbar.cancel') }}
      </ui-button>

      <ui-tag
        data-testid="bulk-toolbar__count"
        data-theme="purple-500"
        data-theme-dark="purple-800"
      >
        {{ t('deck-view.bulk-toolbar.count', { count: selected_count }) }}
      </ui-tag>
    </template>

    <template #right>
      <pager />
    </template>
  </toolbar-base>
</template>

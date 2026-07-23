<script lang="ts" setup>
import List from './list.vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import { inject } from 'vue'
import { cardEditorKey } from '@/views/deck/composables'

defineOptions({ inheritAttrs: false })

const { t } = useI18n()
const { list, addCardAtTop } = inject(cardEditorKey)!
const { all_cards } = list
</script>

<template>
  <div
    v-if="!all_cards.length"
    data-testid="card-list__empty-state"
    v-bind="$attrs"
    class="text-ink-muted flex h-50 flex-col items-center justify-center gap-4"
  >
    <span>{{ t('deck-view.card-editor.list.empty') }}</span>
    <ui-button data-palette="brand" icon-left="add" @press="addCardAtTop">
      {{ t('deck-view.add-card') }}
    </ui-button>
  </div>

  <list v-else v-bind="$attrs" />
</template>

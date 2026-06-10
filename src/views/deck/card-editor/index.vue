<script lang="ts" setup>
import List from './list.vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import { inject } from 'vue'
import { cardEditorKey } from '@/composables/card-editor/card-list-controller'

defineOptions({ inheritAttrs: false })

const { t } = useI18n()
const { list, addCard } = inject(cardEditorKey)!
const { all_cards } = list
</script>

<template>
  <div
    v-if="!all_cards.length"
    data-testid="card-list__empty-state"
    v-bind="$attrs"
    class="text-grey-500 flex h-50 flex-col items-center justify-center gap-4"
  >
    <span>{{ t('deck-view.empty-state.no-cards') }}</span>
    <ui-button data-theme="blue-500" icon-left="add" @click="addCard()">
      {{ t('deck-view.add-card') }}
    </ui-button>
  </div>

  <list v-else v-bind="$attrs" />
</template>

<script setup lang="ts">
import { inject, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import { cardEditorKey } from '@/views/deck/composables'

type CardGridDeleteButtonProps = {
  card_id: number
}

const { card_id } = defineProps<CardGridDeleteButtonProps>()

const { t } = useI18n()
const { actions } = inject(cardEditorKey)!
const deleting = ref(false)

async function onDelete() {
  deleting.value = true
  try {
    await actions.onDeleteCardImmediate(card_id)
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <ui-button
    neutral
    data-testid="card-grid-item__delete-button"
    icon-left="close"
    icon-only
    :loading="deleting"
    @click.stop
    @press="onDelete"
    class="ring-4 ring-surface"
  >
    {{ t('deck-view.item-options.delete') }}
  </ui-button>
</template>

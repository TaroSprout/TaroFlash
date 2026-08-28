<script setup lang="ts">
import { inject, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import { cardEditorKey } from '@/views/deck/composables'

type CardGridDeleteButtonProps = {
  card_id: number
}

const { card_id } = defineProps<CardGridDeleteButtonProps>()

const { t } = useI18n()
const { actions } = inject(cardEditorKey)!
const button = useTemplateRef<InstanceType<typeof UiButton>>('button')
const deleting = ref(false)

async function onDelete() {
  // The positioned cell, not the card inside it: the pop animates one level
  // in, and the card itself is running the rearrange jiggle keyframes, which
  // would win over any transform the pop sets on it.
  const card_el = (button.value!.$el as HTMLElement).closest<HTMLElement>(
    '[data-testid="card-grid__item"]'
  )!

  deleting.value = true
  try {
    await actions.onDeleteCardImmediate(card_id, card_el)
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <ui-button
    ref="button"
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

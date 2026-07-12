<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import { useDeckEditor } from '@/composables/deck/editor'
import { useDeckDangerActions } from '@/composables/deck/danger-actions'

type DeckGridDeleteButtonProps = {
  deck: Deck
}

const { deck } = defineProps<DeckGridDeleteButtonProps>()

const { t } = useI18n()
const editor = useDeckEditor(deck)
const danger_actions = useDeckDangerActions(editor, deck, () => {})
</script>

<template>
  <ui-button
    data-testid="dashboard__deck-delete-button"
    data-theme="brown-500"
    data-theme-dark="stone-700"
    icon-left="close"
    icon-only
    :loading="danger_actions.deleting.value"
    @click.stop
    @press="danger_actions.onDelete"
    class="ring-4 ring-brown-100 dark:ring-grey-900"
  >
    {{ t('dashboard.deck-grid-item.delete-button') }}
  </ui-button>
</template>

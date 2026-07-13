<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import { useNewDeckAction } from '../composables/new-deck-action'

type DashboardFooterActionsProps = {
  editing_decks?: boolean
}

const { editing_decks = false } = defineProps<DashboardFooterActionsProps>()

const emit = defineEmits<{
  'toggle-edit-decks': []
}>()

const { t } = useI18n()
const { creating_deck, createNewDeck } = useNewDeckAction()
</script>

<template>
  <div
    data-testid="dashboard-footer-actions"
    class="flex w-full items-center gap-2 px-(--dock-px) pt-(--dock-pt) pb-(--dock-pb)"
  >
    <ui-button
      data-testid="dashboard-footer-actions__new-deck"
      icon-left="card-add"
      data-theme="brown-100"
      data-theme-dark="stone-700"
      variant="ghost"
      full-width
      size="lg"
      :disabled="creating_deck || editing_decks"
      @press="createNewDeck"
    >
      {{ t('dashboard.mobile-footer.new-deck-label') }}
    </ui-button>

    <ui-button
      data-testid="dashboard-footer-actions__edit-decks"
      :icon-left="editing_decks ? 'stop' : 'pencil'"
      data-theme="yellow-500"
      data-theme-dark="yellow-700"
      full-width
      size="lg"
      @press="emit('toggle-edit-decks')"
    >
      {{
        editing_decks
          ? t('dashboard.mobile-footer.done-editing-label')
          : t('dashboard.mobile-footer.edit-decks-label')
      }}
    </ui-button>
  </div>
</template>

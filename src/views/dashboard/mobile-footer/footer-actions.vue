<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import { useStudyModal } from '@/views/study-session/composables/study-modal'
import { useNewDeckAction } from '../composables/new-deck-action'

type DashboardFooterActionsProps = {
  due_decks: Deck[]
  editing_decks?: boolean
}

const { due_decks, editing_decks = false } = defineProps<DashboardFooterActionsProps>()

const emit = defineEmits<{
  'toggle-edit-decks': []
}>()

const { t } = useI18n()
const study_session = useStudyModal()
const { creating_deck, createNewDeck } = useNewDeckAction()

function onStudyAll() {
  study_session.start(due_decks)
}
</script>

<template>
  <div
    data-testid="dashboard-footer-actions"
    class="flex w-full items-center gap-2 px-(--dock-px) pt-(--dock-pt) pb-(--dock-pb)"
  >
    <ui-button
      data-testid="dashboard-footer-actions__new-deck"
      icon-only
      icon-left="card-add"
      data-theme="brown-300"
      data-theme-dark="stone-700"
      variant="ghost"
      size="lg"
      :disabled="creating_deck || editing_decks"
      @press="createNewDeck"
    >
      {{ t('dashboard.mobile-footer.new-deck-label') }}
    </ui-button>

    <ui-button
      data-testid="dashboard-footer-actions__study-button"
      icon-left="book-flip-page"
      data-theme="brown-300"
      data-theme-dark="stone-900"
      full-width
      size="lg"
      :disabled="editing_decks"
      @press="onStudyAll"
    >
      {{ t('dashboard.mobile-footer.study-button', due_decks.length) }}
    </ui-button>

    <ui-button
      v-if="editing_decks"
      data-testid="dashboard-footer-actions__edit-decks"
      icon-only
      icon-left="stop"
      data-theme="yellow-500"
      data-theme-dark="yellow-700"
      size="lg"
      @press="emit('toggle-edit-decks')"
    >
      {{ t('dashboard.mobile-footer.done-editing-label') }}
    </ui-button>

    <ui-button
      v-else
      data-testid="dashboard-footer-actions__edit-decks"
      icon-only
      icon-left="pencil"
      data-theme="brown-300"
      data-theme-dark="stone-700"
      variant="ghost"
      size="lg"
      @press="emit('toggle-edit-decks')"
    >
      {{ t('dashboard.mobile-footer.edit-decks-label') }}
    </ui-button>
  </div>
</template>

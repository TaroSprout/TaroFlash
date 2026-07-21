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
  study_session.start(due_decks.map((deck) => deck.id))
}
</script>

<template>
  <div
    data-testid="dashboard-footer-actions"
    class="flex w-full items-center gap-2 px-(--dock-px) pt-(--dock-pt) pb-(--dock-pb)"
  >
    <ui-button
      neutral
      data-testid="dashboard-footer-actions__new-deck"
      icon-only
      icon-left="card-add"
      variant="ghost"
      size="lg"
      :disabled="creating_deck || editing_decks"
      @press="createNewDeck"
    >
      {{ t('dashboard.mobile-footer.new-deck-label') }}
    </ui-button>

    <ui-button
      neutral
      data-testid="dashboard-footer-actions__study-button"
      icon-left="book-flip-page"
      variant="ghost"
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
      data-palette="yellow"
      size="lg"
      @press="emit('toggle-edit-decks')"
    >
      {{ t('dashboard.mobile-footer.done-editing-label') }}
    </ui-button>

    <ui-button
      neutral
      v-else
      data-testid="dashboard-footer-actions__edit-decks"
      icon-only
      icon-left="pencil"
      variant="ghost"
      size="lg"
      @press="emit('toggle-edit-decks')"
    >
      {{ t('dashboard.mobile-footer.edit-decks-label') }}
    </ui-button>
  </div>
</template>

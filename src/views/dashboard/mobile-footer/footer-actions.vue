<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import { computed } from 'vue'
import { useStudyModal } from '@/views/study-session/composables/study-modal'
import { useNewDeckAction } from '../composables/new-deck-action'
import { totalDueCardCount } from '@/utils/deck/due'

type DashboardFooterActionsProps = {
  due_decks: Deck[]
  editing_decks?: boolean
  has_decks?: boolean
}

const {
  due_decks,
  editing_decks = false,
  has_decks = false
} = defineProps<DashboardFooterActionsProps>()

const emit = defineEmits<{
  'toggle-edit-decks': []
}>()

const { t } = useI18n()
const study_session = useStudyModal()
const { creating_deck, createNewDeck } = useNewDeckAction()

const due_card_count = computed(() => totalDueCardCount(due_decks))

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
      data-testid="dashboard-footer-actions__study-button"
      icon-left="book-flip-page"
      data-palette="brand"
      full-width
      size="lg"
      :disabled="editing_decks || due_card_count === 0"
      @press="onStudyAll"
    >
      {{
        due_card_count === 0
          ? t('dashboard.actions-panel.no-decks-due-label')
          : t('dashboard.mobile-footer.study-button', due_card_count)
      }}
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
      :disabled="!has_decks"
      @press="emit('toggle-edit-decks')"
    >
      {{ t('dashboard.mobile-footer.edit-decks-label') }}
    </ui-button>
  </div>
</template>

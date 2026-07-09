<script setup lang="ts">
import UiButton from '@/components/ui-kit/button.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStudyModal } from '@/components/flashcard-session/composables/study-modal'

type StudyButtonProps = {
  deck: Deck
  disabled?: boolean
}

const { deck, disabled = false } = defineProps<StudyButtonProps>()

const { t } = useI18n()
const study_session = useStudyModal()

const has_due_cards = computed(() => (deck.due_count ?? 0) > 0)
const is_disabled = computed(() => disabled || !has_due_cards.value)

function onStudyClicked() {
  study_session.start([deck])
}
</script>

<template>
  <ui-button
    data-testid="overview-panel__study-button"
    data-theme="blue-500"
    data-theme-dark="blue-650"
    full-width
    size="xl"
    :sfx="{ tap_pre: 'snappy_button_3' }"
    :disabled="is_disabled"
    @press="onStudyClicked"
  >
    <div v-if="has_due_cards" class="text-brown-100">
      {{ t('deck-view.hero.study') }}
      <span class="bg-brown-100 dark:text-blue-650 text-blue-500 px-1 py-0.5 -rotate-5 rounded-1.5">
        {{ deck.due_count }}
      </span>
      {{ t('deck-view.hero.cards-label') }}
    </div>
    <div v-else class="text-brown-100">
      {{ t('deck-view.hero.no-cards-due') }}
    </div>
  </ui-button>
</template>

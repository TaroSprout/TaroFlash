<script setup lang="ts">
import SessionFlashcard from './session-flashcard/index.vue'
import { computed, useTemplateRef } from 'vue'
import mobileSheet from '@/components/layout-kit/modal/mobile-sheet.vue'
import { provideDeckContext } from './deck-context'
import type { CardReviewResult } from './composables/session-core'

export type StudySessionResponse = {
  results: CardReviewResult[]
  remaining_due: number
  study_all_used: boolean
}

const { deck, close, config_override } = defineProps<{
  deck: Deck
  close: (response?: StudySessionResponse) => void
  config_override?: Partial<DeckConfig>
}>()

provideDeckContext(
  computed(() => ({
    cover_config: deck.cover_config,
    card_attributes: deck.card_attributes
  }))
)

// When additional study modes are added, swap this for a computed that
// maps deck.study_config?.study_mode to the appropriate mode component.
const mode_ref = useTemplateRef<InstanceType<typeof SessionFlashcard>>('mode')

function onCloseButtonClicked() {
  if (mode_ref.value?.requestClose) {
    // The mode component will decide how to handle the close request.
    mode_ref.value.requestClose()
    return
  }

  close()
}

function onSessionFinished(
  results: CardReviewResult[],
  remaining_due: number,
  study_all_used: boolean
) {
  close({ results, remaining_due, study_all_used })
}
</script>

<template>
  <mobile-sheet
    data-testid="study-session"
    class="sm:max-w-170!"
    :data-theme="deck?.cover_config?.theme ?? 'purple-500'"
    @close="onCloseButtonClicked"
  >
    <template #header-content>
      <h1 class="text-5xl text-white">{{ deck?.title }}</h1>
    </template>

    <session-flashcard
      ref="mode"
      :deck="deck"
      :config_override="config_override"
      @closed="close"
      @finished="onSessionFinished"
    />
  </mobile-sheet>
</template>

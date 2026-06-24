<script setup lang="ts">
import SessionFlashcard from './session-flashcard/index.vue'
import SessionSummary from './session-summary/index.vue'
import { computed, ref } from 'vue'
import { emitStudySfx } from '@/sfx/bus'
import { provideDeckContext } from './deck-context'
import { sessionPaneEnter, sessionPaneLeave } from '@/utils/animations/session-pane'
import type { CardReviewResult } from './composables/session-core'
import type { SecondaryAction } from './composables/study-modal'

type Phase = 'studying' | 'summary'

const { deck, close, config_override } = defineProps<{
  deck: Deck
  close: (response?: SecondaryAction) => void
  config_override?: Partial<DeckConfig>
}>()

provideDeckContext(
  computed(() => ({
    cover_config: deck.cover_config,
    card_attributes: deck.card_attributes
  }))
)

const phase = ref<Phase>('studying')
const results = ref<CardReviewResult[]>([])
const secondary_action = ref<SecondaryAction>('study-all')

function onSessionFinished(
  session_results: CardReviewResult[],
  remaining_due: number,
  study_all_used: boolean
) {
  results.value = session_results
  secondary_action.value = study_all_used
    ? 'study-again'
    : remaining_due > 0
      ? 'study-more'
      : 'study-all'

  emitStudySfx('music_pizz_duo_hi')
  phase.value = 'summary'
}

function onPaneLeave(el: Element, done: () => void) {
  sessionPaneLeave(el, done)
}

function onPaneEnter(el: Element, done: () => void) {
  if (phase.value !== 'summary') return done()
  sessionPaneEnter(el, done)
}
</script>

<template>
  <div
    data-testid="study-session"
    :data-theme="deck?.cover_config?.theme ?? 'purple-500'"
    class="relative w-full max-w-170 h-170 overflow-hidden rounded-8 bg-brown-300 shadow-lg bgx-dot-grid bgx-size-15 bgx-opacity-25 bgx-color-brown-500"
  >
    <div
      data-testid="study-session__outlet"
      class="relative w-full h-full overflow-hidden [--session-padding:2rem]"
    >
      <transition :css="false" mode="out-in" @leave="onPaneLeave" @enter="onPaneEnter">
        <session-flashcard
          v-if="phase === 'studying'"
          key="studying"
          :deck="deck"
          :config_override="config_override"
          @closed="close()"
          @finished="onSessionFinished"
        />
        <session-summary
          v-else
          key="summary"
          :results="results"
          :secondary_action="secondary_action"
          @action="close"
        />
      </transition>
    </div>
  </div>
</template>

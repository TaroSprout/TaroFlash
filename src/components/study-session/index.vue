<script setup lang="ts">
import SessionFlashcard from './session-flashcard/index.vue'
import SessionSummary from './session-summary/index.vue'
import { computed, ref } from 'vue'
import { emitSfx, emitStudySfx } from '@/sfx/bus'
import { provideDeckContext } from './deck-context'
import { provideStudyViewport } from './viewport-context'
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
const viewport = provideStudyViewport()

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

/** Early close (close button / backdrop / esc before any review). */
function onClosed() {
  emitSfx('snappy_button_5')
  close()
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
    class="relative w-full max-w-160 overflow-hidden bg-brown-300 dark:bg-grey-800 bgx-dot-grid bgx-size-15 bgx-opacity-25 dark:bgx-opacity-10 bgx-color-brown-500"
    :class="
      viewport === 'mobile'
        ? 'h-full outline-1 outline-brown-100'
        : 'h-160 rounded-8 shadow-lg border-t border-l border-brown-100 dark:border-grey-900'
    "
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
          @closed="onClosed"
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

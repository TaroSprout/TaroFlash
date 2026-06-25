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

function onSessionFinished(session_results: CardReviewResult[]) {
  results.value = session_results
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
  sessionPaneEnter(el, done, () => emitStudySfx('music_pizz_duo_hi'))
}
</script>

<template>
  <div
    data-testid="study-session"
    class="relative w-full max-w-160 overflow-hidden bg-brown-300 dark:bg-grey-800 bgx-dot-grid bgx-size-15 bgx-opacity-25 dark:bgx-opacity-10 bgx-color-brown-500"
    :class="
      viewport === 'mobile'
        ? 'h-full outline-1 outline-brown-100 [--session-padding:1.5rem]'
        : 'h-160 rounded-8 shadow-lg border-t border-l border-brown-100 dark:border-grey-900 [--session-padding:2rem]'
    "
  >
    <div data-testid="study-session__outlet" class="relative w-full h-full overflow-hidden">
      <transition :css="false" @leave="onPaneLeave" @enter="onPaneEnter">
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
          class="absolute inset-0 z-10"
          :deck="deck"
          :results="results"
          @close="onClosed"
        />
      </transition>
    </div>
  </div>
</template>

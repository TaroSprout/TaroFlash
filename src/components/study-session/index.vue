<script setup lang="ts">
import SessionFlashcard from './session-flashcard/index.vue'
import SessionSummary from './session-summary/index.vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import DialogCard from '@/components/layout-kit/dialog-card/dialog-card.vue'
import { emitSfx, emitStudySfx } from '@/sfx/bus'
import { useProvideDeckContext } from './deck-context'
import { sessionPaneEnter, sessionPaneLeave } from '@/utils/animations/session-pane'
import { clearPersistedSession } from './composables/session-persistence'
import type { CardReviewResult } from './composables/session-core'
import type { SecondaryAction } from './composables/study-modal'

type Phase = 'studying' | 'summary'

const { decks, close, config_override } = defineProps<{
  decks: Deck[]
  close: (response?: SecondaryAction) => void
  config_override?: Partial<DeckConfig>
}>()

const { t } = useI18n()

const title = computed(() =>
  decks.length === 1 ? (decks[0]?.title ?? '') : t('study-session.multiple-decks-title')
)

useProvideDeckContext(() => decks)

const phase = ref<Phase>('studying')
const results = ref<CardReviewResult[]>([])

function onSessionFinished(session_results: CardReviewResult[]) {
  results.value = session_results
  phase.value = 'summary'
}

/** Early close (close button / backdrop / esc before any review). */
function onClosed() {
  emitSfx('snappy_button_5')
  clearPersistedSession()
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
  <dialog-card
    data-testid="study-session"
    class="h-170 w-full max-w-160 bg-brown-300 dark:bg-grey-800 bgx-dot-grid bgx-size-15 bgx-opacity-25 dark:bgx-opacity-10 bgx-color-brown-500"
    viewport_query="w<sm"
    :show_close_button="false"
  >
    <template #default="{ viewport }">
      <div
        class="w-full h-full"
        :class="
          viewport === 'mobile'
            ? 'outline-1 outline-brown-100'
            : 'border-t border-l border-brown-100 dark:border-grey-900'
        "
      >
        <div data-testid="study-session__outlet" class="relative w-full h-full overflow-hidden">
          <transition :css="false" @leave="onPaneLeave" @enter="onPaneEnter">
            <session-flashcard
              v-if="phase === 'studying'"
              key="studying"
              :decks="decks"
              :title="title"
              :config_override="config_override"
              @closed="onClosed"
              @finished="onSessionFinished"
            />
            <session-summary
              v-else
              key="summary"
              class="absolute inset-0 z-10"
              :title="title"
              :results="results"
              @close="onClosed"
            />
          </transition>
        </div>
      </div>
    </template>
  </dialog-card>
</template>

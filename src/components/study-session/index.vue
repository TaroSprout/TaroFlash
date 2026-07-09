<script setup lang="ts">
import SessionFlashcard from './session-flashcard/index.vue'
import SessionSummary from './session-summary/index.vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import DialogCard from '@/components/layout-kit/dialog-card/index.vue'
import DialogCardPager from '@/components/layout-kit/dialog-card/dialog-card-pager.vue'
import { emitSfx, emitStudySfx } from '@/sfx/bus'
import { useProvideDeckContext } from './deck-context'
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

function onPaneEnterStart() {
  emitStudySfx('music_pizz_duo_hi')
}
</script>

<template>
  <dialog-card
    data-testid="study-session"
    class="bgx-dot-grid bgx-size-15 bgx-opacity-25 dark:bgx-opacity-10 bgx-color-brown-500"
    bg_class="bg-brown-300 dark:bg-grey-800"
    size="lg"
  >
    <template #header>
      <div data-testid="study-session__header-target"></div>
    </template>

    <template #default>
      <div data-testid="study-session__outlet" class="relative w-full h-full">
        <dialog-card-pager @enter-start="onPaneEnterStart">
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
        </dialog-card-pager>
      </div>
    </template>
  </dialog-card>
</template>

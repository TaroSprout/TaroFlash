<script setup lang="ts">
import SessionStudying from './session-studying/index.vue'
import SessionSummary from './session-summary/index.vue'
import SessionHeaderCloseButton from './session-header-close-button.vue'
import SessionHeaderMenu from './session-header-menu.vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import DialogCard from '@/components/layout-kit/dialog-card/index.vue'
import DialogCardPager from '@/components/layout-kit/dialog-card/dialog-card-pager.vue'
import { emitSfx, emitStudySfx } from '@/sfx/bus'
import { useProvideDeckContext } from './deck-context'
import { clearPersistedSession } from './composables/session-persistence'
import { provideStudySessionController } from './composables/session-controller'
import { useModalRequestClose } from '@/composables/modal'
import type { CardReviewResult } from './composables/session-queue'
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

const {
  is_cover,
  can_edit,
  show_all_ratings,
  requestClose,
  startEdit,
  onMove,
  onDelete,
  toggleRatings
} = provideStudySessionController({
  decks,
  config_override,
  onFinished: onSessionFinished,
  onClosed
})

useModalRequestClose(onHeaderStop)

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

/** Header close/stop button, and the modal backdrop / esc handler. */
function onHeaderStop() {
  if (phase.value === 'studying') requestClose()
  else onClosed()
}
</script>

<template>
  <dialog-card
    data-testid="study-session"
    class="bgx-dot-grid bgx-size-15 bgx-opacity-25 dark:bgx-opacity-10 bgx-color-brown-500"
    bg_class="bg-brown-300 dark:bg-grey-800"
    size="lg"
    :title="title"
  >
    <template #header-start>
      <session-header-close-button
        :is_cover="phase === 'summary' || is_cover"
        @stop="onHeaderStop"
      />
    </template>

    <template v-if="phase === 'studying'" #header-end>
      <session-header-menu
        :can_edit="can_edit"
        :show_all_ratings="show_all_ratings"
        @edit="startEdit"
        @move="onMove"
        @delete="onDelete"
        @toggle-ratings="toggleRatings"
      />
    </template>

    <template #default>
      <div data-testid="study-session__outlet" class="relative w-full h-full">
        <dialog-card-pager @enter-start="onPaneEnterStart">
          <session-studying v-if="phase === 'studying'" key="studying" />
          <session-summary
            v-else
            key="summary"
            class="absolute inset-0 z-10"
            :results="results"
            @close="onClosed"
          />
        </dialog-card-pager>
      </div>
    </template>
  </dialog-card>
</template>

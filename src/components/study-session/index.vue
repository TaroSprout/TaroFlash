<script setup lang="ts">
import SessionFlashcard from './session-flashcard/index.vue'
import SessionSummary from './session-summary/index.vue'
import { computed, ref, useTemplateRef } from 'vue'
import mobileSheet from '@/components/layout-kit/modal/mobile-sheet.vue'
import { useI18n } from 'vue-i18n'
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

const { t } = useI18n()

provideDeckContext(
  computed(() => ({
    cover_config: deck.cover_config,
    card_attributes: deck.card_attributes
  }))
)

// When additional study modes are added, swap SessionFlashcard for a computed
// that maps deck.study_config?.study_mode to the appropriate mode component.
const mode_ref = useTemplateRef<InstanceType<typeof SessionFlashcard>>('mode')
const outlet = ref<HTMLElement>()

const phase = ref<Phase>('studying')
const results = ref<CardReviewResult[]>([])
const secondary_action = ref<SecondaryAction>('study-all')

const header_title = computed(() =>
  phase.value === 'summary' ? t('session-summary.heading') : deck?.title
)

function onCloseButtonClicked() {
  if (phase.value === 'studying' && mode_ref.value?.requestClose) {
    // The mode component decides how to handle the close request.
    mode_ref.value.requestClose()
    return
  }

  close()
}

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
  sessionPaneLeave(outlet.value)(el, done)
}

function onPaneEnter(el: Element, done: () => void) {
  if (phase.value !== 'summary') return done()
  sessionPaneEnter(outlet.value)(el, done)
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
      <h1 data-testid="study-session__title" class="text-5xl text-white">{{ header_title }}</h1>
    </template>

    <div
      ref="outlet"
      data-testid="study-session__outlet"
      class="relative w-full overflow-hidden [--session-padding:2rem]"
    >
      <transition :css="false" mode="out-in" @leave="onPaneLeave" @enter="onPaneEnter">
        <session-flashcard
          v-if="phase === 'studying'"
          ref="mode"
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
  </mobile-sheet>
</template>

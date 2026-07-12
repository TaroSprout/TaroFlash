<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import { useStudyModal } from '@/views/study-session/composables/study-modal'
import {
  actionsSwingBeforeEnter,
  actionsSwingEnter,
  actionsSwingLeave
} from '@/utils/animations/dashboard-actions'

type MemberSectionActionsPanelProps = {
  due_decks: Deck[]
  open: boolean
}

const { due_decks, open } = defineProps<MemberSectionActionsPanelProps>()

const { t } = useI18n()
const study_session = useStudyModal()

const study_button_key = computed(() => {
  if (due_decks.length === 1) return 'review-inbox.study-button'
  if (due_decks.length === 2) return 'review-inbox.study-both-button'
  return 'review-inbox.study-all-button'
})

function onStudyAll() {
  study_session.start(due_decks)
}
</script>

<template>
  <transition
    :css="false"
    @before-enter="actionsSwingBeforeEnter"
    @enter="actionsSwingEnter"
    @leave="actionsSwingLeave"
  >
    <div v-if="open" style="perspective: 1200px">
      <div
        data-testid="dashboard__actions-panel"
        class="w-full rounded-8 bg-brown-300 dark:bg-stone-900 select-none p-3"
      >
        <ui-button
          size="xl"
          icon-left="book-flip-page"
          data-theme="brown-100"
          data-theme-dark="stone-700"
          class="w-full!"
          @press="onStudyAll"
        >
          {{ t(study_button_key) }}
        </ui-button>
      </div>
    </div>
  </transition>
</template>

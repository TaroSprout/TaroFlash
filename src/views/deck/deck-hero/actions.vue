<script setup lang="ts">
import UiButton from '@/components/ui-kit/button.vue'
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStudyModal } from '@/composables/modals/use-study-modal'
import { type CardListController } from '@/composables/card-editor/card-list-controller'

const { deck } = defineProps<{ deck: Deck }>()

const { t } = useI18n()
const study_session = useStudyModal()

const editor = inject<CardListController | null>('card-editor', null)
const mode = editor?.mode

function onStudyClicked() {
  study_session.start(deck)
}

function onToggleEditCards() {
  if (!editor) return
  editor.setMode(editor.mode.value === 'edit' ? 'view' : 'edit')
}
</script>

<template>
  <div data-testid="deck-hero__actions" class="w-full flex flex-col gap-2">
    <ui-button
      data-testid="overview-panel__study-button"
      data-theme="blue-500"
      data-theme-dark="blue-650"
      full-width
      size="xl"
      @click="onStudyClicked"
    >
      <div class="text-brown-100">
        {{ t('deck-view.hero.study') }}
        <span
          class="bg-brown-100 dark:text-blue-650 text-blue-500 px-1 py-0.5 -rotate-5 rounded-1.5"
        >
          {{ deck.due_count }}
        </span>
        {{ t('deck-view.hero.cards-label') }}
      </div>
    </ui-button>

    <ui-button
      data-testid="overview-panel__settings-button"
      :icon-left="mode === 'edit' ? 'stop' : 'edit'"
      :data-theme="mode === 'edit' ? 'yellow-500' : 'brown-300'"
      :data-theme-dark="mode === 'edit' ? 'yellow-700' : 'stone-700'"
      full-width
      size="xl"
      @click="onToggleEditCards"
      v-sfx.click="'ui.select'"
    >
      {{
        mode === 'edit' ? t('deck-view.actions.stop-editing') : t('deck-view.actions.edit-cards')
      }}
    </ui-button>
  </div>
</template>

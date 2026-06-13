<script setup lang="ts">
import UiButton from '@/components/ui-kit/button.vue'
import UiDropdownButton, {
  type DropdownOption
} from '@/components/ui-kit/dropdown-button/index.vue'
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStudyModal } from '@/composables/modals/use-study-modal'
import { useDeckSettingsModal } from '@/composables/modals/use-deck-settings-modal'
import { cardEditorKey } from '@/composables/card-editor/card-list-controller'
import { deckViewShellKey } from '@/composables/card-editor/deck-view-shell'

const { deck } = defineProps<{ deck: Deck }>()

const { t } = useI18n()
const study_session = useStudyModal()
const deck_settings = useDeckSettingsModal()

const editor = inject(cardEditorKey, null)
const shell = inject(deckViewShellKey, null)

const is_editing = computed(() => shell?.mode.value === 'edit')
const has_due_cards = computed(() => (deck.due_count ?? 0) > 0)
const edit_options = computed<DropdownOption[]>(() => [
  { label: t('deck-view.actions.select-cards'), value: 'select', icon: 'data-check' },
  {
    label: t('deck-view.actions.edit-card-appearance'),
    value: 'appearance',
    icon: 'align-horizontal-frame'
  }
])

function onStudyClicked() {
  study_session.start(deck)
}

function onToggleEditCards() {
  shell?.toggleMode('edit')
}

function onEditOption(option: DropdownOption) {
  if (option.value === 'select') editor?.actions.onSelectCard()
  else if (option.value === 'appearance') deck_settings.open(deck, { tab: 'design', side: 'front' })
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
      :sfx="{ click: 'ui.snappy_button_3' }"
      :disabled="!has_due_cards"
      @click="onStudyClicked"
    >
      <div v-if="has_due_cards" class="text-brown-100">
        {{ t('deck-view.hero.study') }}
        <span
          class="bg-brown-100 dark:text-blue-650 text-blue-500 px-1 py-0.5 -rotate-5 rounded-1.5"
        >
          {{ deck.due_count }}
        </span>
        {{ t('deck-view.hero.cards-label') }}
      </div>
      <div v-else class="text-brown-100">
        {{ t('deck-view.hero.no-cards-due') }}
      </div>
    </ui-button>

    <ui-dropdown-button
      data-testid="overview-panel__settings-button"
      :options="edit_options"
      :icon-left="is_editing ? 'stop' : 'edit'"
      :data-theme="is_editing ? 'yellow-500' : 'brown-300'"
      :data-theme-dark="is_editing ? 'yellow-700' : 'stone-700'"
      trigger-theme="brown-200"
      full-width
      size="xl"
      @click="onToggleEditCards"
      @select="onEditOption"
    >
      {{ is_editing ? t('deck-view.actions.stop-editing') : t('deck-view.actions.edit-cards') }}
    </ui-dropdown-button>
  </div>
</template>

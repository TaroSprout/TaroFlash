<script setup lang="ts">
import UiButton from '@/components/ui-kit/button.vue'
import UiDropdownButton, {
  type DropdownOption
} from '@/components/ui-kit/dropdown-button/index.vue'
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStudyModal } from '@/components/study-session/composables/study-modal'
import { useDeckSettingsModal } from '@/composables/deck/settings-modal'
import { cardEditorKey } from '@/views/deck/composables'
import { deckViewShellKey } from '@/views/deck/composables/view-shell'
import { mobileCardEditorKey } from '@/views/deck/mobile-editor/use-mobile-card-editor'
import { useMatchMedia } from '@/composables/ui/media-query'

const { deck } = defineProps<{ deck: Deck }>()

const { t } = useI18n()
const study_session = useStudyModal()
const deck_settings = useDeckSettingsModal()

const editor = inject(cardEditorKey, null)
const shell = inject(deckViewShellKey, null)
const mobile_editor = inject(mobileCardEditorKey, null)
const is_mobile = useMatchMedia('w<md')

const is_editing = computed(() => shell?.mode.value === 'edit')
const has_due_cards = computed(() => (deck.due_count ?? 0) > 0)

// The horizontal mobile layout is tight, so the edit action drops to a one-word
// label there. Editing mode only happens at md+, where the full label shows.
const edit_label = computed(() => {
  if (is_editing.value) return t('deck-view.actions.stop-editing')
  return is_mobile.value
    ? t('deck-view.actions.edit-cards-short')
    : t('deck-view.actions.edit-cards')
})
const edit_options = computed<DropdownOption[]>(() => [
  { label: t('deck-view.actions.select-cards'), value: 'select', icon: 'data-check' },
  {
    label: shell?.is_rearranging.value
      ? t('deck-view.actions.stop-rearranging')
      : t('deck-view.actions.rearrange-cards'),
    value: 'rearrange',
    icon: 'rearrange'
  },
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
  // Below md there's no list editor — the edit button opens the focused dock
  // editor on the first card instead of toggling the desktop edit mode.
  if (is_mobile.value) {
    mobile_editor?.open_at()
    return
  }

  shell?.toggleMode('edit')
}

function onEditOption(option: DropdownOption) {
  if (option.value === 'select') editor?.actions.onSelectCard()
  else if (option.value === 'rearrange') shell?.toggleRearrange()
  else if (option.value === 'appearance') deck_settings.open(deck, { tab: 'design', side: 'front' })
}
</script>

<template>
  <div data-testid="deck-hero__actions" class="w-full flex flex-row md:flex-col gap-2">
    <div data-testid="deck-hero__study-action" class="flex-1 min-w-0">
      <ui-button
        data-testid="overview-panel__study-button"
        data-theme="blue-500"
        data-theme-dark="blue-650"
        full-width
        size="xl"
        :sfx="{ press: 'snappy_button_3' }"
        :disabled="!has_due_cards"
        @press="onStudyClicked"
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
    </div>

    <div data-testid="deck-hero__edit-action" class="shrink-0 md:w-full">
      <ui-dropdown-button
        data-testid="overview-panel__settings-button"
        :options="edit_options"
        :icon-left="is_editing ? 'stop' : 'edit'"
        :data-theme="is_editing ? 'yellow-500' : 'brown-300'"
        :data-theme-dark="is_editing ? 'yellow-700' : 'stone-700'"
        trigger-theme="brown-200"
        menu-class="dark:outline-1 dark:outline-grey-900"
        full-width
        size="xl"
        @click="onToggleEditCards"
        @select="onEditOption"
      >
        {{ edit_label }}
      </ui-dropdown-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardActionsPanelShell from './shell.vue'
import DashboardActionsPanelPolaroid from './polaroid.vue'
import UiOptionsPanel, { type OptionsPanelEntry } from '@/components/ui-kit/options-panel/index.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { useMemberStore } from '@/stores/member'
import { memberCoverBindings } from '@/components/member/cover'
import { useStudyModal } from '@/views/study-session/composables/study-modal'
import { useNewDeckAction } from '../composables/new-deck-action'

type DashboardActionsPanelProps = {
  due_decks: Deck[]
  editing_decks?: boolean
}

const { due_decks, editing_decks = false } = defineProps<DashboardActionsPanelProps>()

const emit = defineEmits<{
  'toggle-edit-decks': []
}>()

const { t } = useI18n()
const member_store = useMemberStore()
const study_session = useStudyModal()
const { creating_deck, createNewDeck } = useNewDeckAction()

const root_bindings = computed(() => memberCoverBindings(member_store.cover))

const deck_entries = computed<OptionsPanelEntry[]>(() => [
  {
    value: 'new-deck',
    label: t('dashboard.actions-panel.new-deck-label'),
    trailingIcon: 'card-add',
    disabled: creating_deck.value || editing_decks
  },
  {
    value: 'edit-decks',
    label: editing_decks
      ? t('dashboard.actions-panel.done-editing-label')
      : t('dashboard.actions-panel.edit-decks-label'),
    trailingIcon: editing_decks ? 'stop' : 'pencil',
    selected: editing_decks,
    selectedTheme: 'yellow-500',
    selectedThemeDark: 'yellow-700'
  }
])

function onStudyAll() {
  study_session.start(due_decks.map((deck) => deck.id))
}

async function onSelect(value: string) {
  if (value === 'edit-decks') {
    emit('toggle-edit-decks')
    return
  }

  if (value !== 'new-deck' || creating_deck.value || editing_decks) return

  await createNewDeck()
}
</script>

<template>
  <dashboard-actions-panel-shell
    data-testid="dashboard-actions-panel"
    v-bind="root_bindings"
    class="bg-(--theme-primary)"
    body_class="bg-surface"
  >
    <template #polaroid>
      <dashboard-actions-panel-polaroid />
    </template>

    <template #header>
      <span
        data-testid="dashboard-actions-panel__header"
        class="text-(--theme-on-primary) text-4xl font-semibold truncate"
      >
        {{ member_store.display_name || t('member-badge.name-placeholder') }}
      </span>
    </template>

    <template #body>
      <ui-options-panel
        :entries="deck_entries"
        size="lg"
        class="max-mxl:hidden"
        data-testid="dashboard-actions-panel__deck-options"
        @select="onSelect"
      />

      <ui-button
        data-testid="dashboard-actions-panel__study-button"
        size="xl"
        icon-left="book-flip-page"
        data-theme="blue-500"
        data-theme-dark="blue-650"
        full-width
        :disabled="editing_decks || due_decks.length === 0"
        @press="onStudyAll"
      >
        {{
          due_decks.length === 0
            ? t('dashboard.actions-panel.no-decks-due-label')
            : t('dashboard.actions-panel.study-button', due_decks.length)
        }}
      </ui-button>
    </template>
  </dashboard-actions-panel-shell>
</template>

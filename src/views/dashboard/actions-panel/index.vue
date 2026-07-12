<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardActionsPanelPolaroid from './polaroid.vue'
import UiOptionsPanel, { type OptionsPanelEntry } from '@/components/ui-kit/options-panel/index.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { useMemberStore } from '@/stores/member'
import { memberCoverBindings } from '@/components/member/cover'
import { useStudyModal } from '@/views/study-session/composables/study-modal'
import { useDeckActions } from '@/composables/deck/actions'
import { buildNewDeckPayload } from '@/utils/deck/defaults'
import { emitSfx } from '@/sfx/bus'

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
const deck_actions = useDeckActions()

const root_bindings = computed(() => memberCoverBindings(member_store.cover))
const creating_deck = ref(false)

const deck_entries = computed<OptionsPanelEntry[]>(() => [
  {
    value: 'new-deck',
    label: t('dashboard.actions-panel.new-deck-label'),
    trailingIcon: 'card-add',
    disabled: creating_deck.value
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
  study_session.start(due_decks)
}

async function onSelect(value: string) {
  if (value === 'edit-decks') {
    emit('toggle-edit-decks')
    return
  }

  if (value !== 'new-deck' || creating_deck.value) return

  creating_deck.value = true
  emitSfx('pop_up_pop')
  await deck_actions.createDeck(buildNewDeckPayload(t('deck.default-title')), {
    openSettingsAfterCreate: true
  })
  creating_deck.value = false
}
</script>

<template>
  <div
    data-testid="dashboard-actions-panel"
    v-bind="root_bindings"
    class="bg-(--theme-primary) rounded-8 relative flex flex-col"
  >
    <dashboard-actions-panel-polaroid />

    <span
      data-testid="dashboard-actions-panel__header"
      class="text-(--theme-on-primary) text-4xl font-semibold truncate p-6 pl-34"
    >
      {{ member_store.display_name || t('member-badge.name-placeholder') }}
    </span>

    <div
      data-testid="dashboard-actions-panel__body"
      class="cloud-top-[40px] bg-brown-300 dark:bg-stone-900 rounded-b-8 flex flex-col gap-6 px-4 pt-14 pb-6"
    >
      <ui-options-panel
        data-theme-dark="stone-700"
        :entries="deck_entries"
        size="lg"
        data-testid="dashboard-actions-panel__deck-options"
        @select="onSelect"
      />

      <ui-button
        data-testid="dashboard-actions-panel__study-button"
        size="xl"
        icon-left="book-flip-page"
        data-theme="yellow-500"
        data-theme-dark="yellow-700"
        full-width
        @press="onStudyAll"
      >
        {{ t('dashboard.actions-panel.study-button', due_decks.length) }}
      </ui-button>
    </div>
  </div>
</template>

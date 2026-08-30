<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardActionsPanelShell from './shell.vue'
import MemberPolaroid from '@/components/member/member-polaroid.vue'
import UiOptionsPanel, { type OptionsPanelEntry } from '@/components/ui-kit/options-panel/index.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { useMemberStore } from '@/stores/member'
import { memberCoverBindings } from '@/components/member/cover'
import { useStudyModal } from '@/views/study-session/composables/study-modal'
import { useNewDeckAction } from '../composables/new-deck-action'
import { useMobileDock } from '@/components/mobile-dock/use-mobile-dock'
import { totalDueCardCount } from '@/utils/deck/due'

type DashboardActionsPanelProps = {
  due_decks: Deck[]
  editing_decks?: boolean
  has_decks?: boolean
}

const {
  due_decks,
  editing_decks = false,
  has_decks = false
} = defineProps<DashboardActionsPanelProps>()

const emit = defineEmits<{
  'toggle-edit-decks': []
}>()

const { t } = useI18n()
const member_store = useMemberStore()
const study_session = useStudyModal()
const { creating_deck, createNewDeck } = useNewDeckAction()
// Never re-derive this from a media query: it has to say what the dock itself hides on.
const { is_visible: dock_on_screen } = useMobileDock()

const root_bindings = computed(() => memberCoverBindings(member_store.cover))
const due_card_count = computed(() => totalDueCardCount(due_decks))

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
    selectedPalette: 'yellow',
    disabled: !editing_decks && !has_decks
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
    class="bg-(--color-accent)"
    body_class="bg-surface"
  >
    <template #polaroid>
      <member-polaroid :avatar="member_store.cover.avatar" class="absolute top-1 -left-1 z-10" />
    </template>

    <template #header>
      <span
        data-testid="dashboard-actions-panel__header"
        class="text-(--color-on-accent) block text-4xl font-semibold truncate"
        :title="member_store.display_name || undefined"
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
        :data-palette="dock_on_screen ? undefined : 'brand'"
        :neutral="dock_on_screen"
        full-width
        :disabled="editing_decks || due_card_count === 0"
        @press="onStudyAll"
      >
        {{
          due_card_count === 0
            ? t('dashboard.actions-panel.no-decks-due-label')
            : t('dashboard.actions-panel.study-button', due_card_count)
        }}
      </ui-button>
    </template>
  </dashboard-actions-panel-shell>
</template>

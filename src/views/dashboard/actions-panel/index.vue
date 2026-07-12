<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardActionsPanelPolaroid from './polaroid.vue'
import UiOptionsPanel, { type OptionsPanelEntry } from '@/components/ui-kit/options-panel/index.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { useMemberStore } from '@/stores/member'
import { memberCoverBindings } from '@/components/member/cover'
import { useStudyModal } from '@/views/study-session/composables/study-modal'

type DashboardActionsPanelProps = {
  due_decks: Deck[]
}

const { due_decks } = defineProps<DashboardActionsPanelProps>()

const { t } = useI18n()
const member_store = useMemberStore()
const study_session = useStudyModal()

const root_bindings = computed(() => memberCoverBindings(member_store.cover))

const deck_entries = computed<OptionsPanelEntry[]>(() => [
  {
    value: 'new-deck',
    label: t('dashboard.actions-panel.new-deck-label'),
    trailingIcon: 'card-deck'
  },
  {
    value: 'edit-decks',
    label: t('dashboard.actions-panel.edit-decks-label'),
    trailingIcon: 'pencil'
  }
])

function onStudyAll() {
  study_session.start(due_decks)
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
      class="text-(--theme-on-primary) text-4xl font-semibold truncate p-6 pl-24 text-center"
    >
      {{ member_store.display_name || t('member-badge.name-placeholder') }}
    </span>

    <div
      data-testid="dashboard-actions-panel__body"
      class="cloud-top-[40px] bg-brown-300 dark:bg-stone-800 rounded-b-8 flex flex-col gap-6 p-4 pt-14"
    >
      <ui-options-panel
        :entries="deck_entries"
        data-testid="dashboard-actions-panel__deck-options"
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

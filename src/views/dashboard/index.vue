<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMemberDecksQuery } from '@/api/decks'
import { useNoticeStore } from '@/stores/notice-store'
import { useCan } from '@/composables/can'
import { useLocalRef } from '@/composables/storage/local-ref'
import { emitSfx } from '@/sfx/bus'
import ScrollBar from '@/components/ui-kit/scroll-bar.vue'
import DashboardShell from './dashboard-shell.vue'
import DashboardSkeleton from './skeleton.vue'
import DashboardSection from './dashboard-section.vue'
import DashboardActionsPanel from './actions-panel/index.vue'
import DashboardMobileFooter from './mobile-footer/index.vue'
import ReviewInbox from './review-inbox/index.vue'
import DeckGrid from './deck-grid/index.vue'
import DeckGridSortOptions, { type SortOption } from './deck-grid/sort-options.vue'
import AudioReaderSection from './audio-reader-section.vue'
import DashboardTipCard from './tip-card/index.vue'

const DECK_SORT_COMPARATORS: Record<SortOption, (a: Deck, b: Deck) => number> = {
  custom: (a, b) => (a.rank ?? 0) - (b.rank ?? 0),
  'date-created': (a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''),
  'last-updated': (a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? '')
}

const { t } = useI18n()
const notice = useNoticeStore()
const can = useCan()

const { data: decks_data, error: decks_error } = useMemberDecksQuery()
const sort_by = useLocalRef<SortOption>('dashboard-deck-sort', 'custom')
const decks = computed(() => {
  return [...(decks_data.value ?? [])].sort(DECK_SORT_COMPARATORS[sort_by.value])
})
const editing_decks = ref(false)

watch(decks_error, (err) => {
  if (err) notice.error(t('dashboard.decks-load-error'))
})

function onToggleEditDecks() {
  editing_decks.value = !editing_decks.value
  emitSfx(editing_decks.value ? 'pop_up_pop' : 'pop_up_close')
}

function onEnterEditDecks() {
  if (!editing_decks.value) onToggleEditDecks()
}

const due_decks = computed(() => {
  return decks.value
    .filter((deck) => (deck.due_count ?? 0) > 0)
    .sort((a, b) => (b.due_count ?? 0) - (a.due_count ?? 0))
})

const show_skeleton = computed(() => !decks_data.value)
</script>

<template>
  <dashboard-skeleton v-if="show_skeleton" />

  <div v-else data-testid="dashboard" class="w-full">
    <dashboard-shell>
      <template #left>
        <dashboard-actions-panel
          :due_decks="due_decks"
          :editing_decks="editing_decks"
          @toggle-edit-decks="onToggleEditDecks"
        />

        <dashboard-tip-card />
      </template>

      <template #right>
        <dashboard-section
          v-if="due_decks.length > 0"
          :label="t('dashboard.deck-filter.due-label')"
        >
          <review-inbox :due_decks="due_decks" :editing="editing_decks" />
        </dashboard-section>

        <dashboard-section :label="t('dashboard.deck-filter.all-label')">
          <template #subheader>
            <deck-grid-sort-options :selected="sort_by" @select="sort_by = $event" />
          </template>

          <deck-grid :decks="decks" :editing="editing_decks" @rearrange="onEnterEditDecks" />
        </dashboard-section>

        <audio-reader-section v-if="can.useAudioReader.value" />
      </template>
    </dashboard-shell>

    <scroll-bar class="fixed right-4 top-(--nav-height) bottom-10 z-30" target="html" />

    <dashboard-mobile-footer
      :due_decks="due_decks"
      :editing_decks="editing_decks"
      @toggle-edit-decks="onToggleEditDecks"
    />
  </div>
</template>

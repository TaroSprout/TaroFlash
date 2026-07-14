<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMemberDecksQuery } from '@/api/decks'
import { useNoticeStore } from '@/stores/notice-store'
import { useCan } from '@/composables/can'
import { useLocalRef } from '@/composables/storage/local-ref'
import { emitSfx } from '@/sfx/bus'
import ScrollBar from '@/components/ui-kit/scroll-bar.vue'
import DashboardSection from './dashboard-section.vue'
import DashboardActionsPanel from './actions-panel/index.vue'
import DashboardMobileFooter from './mobile-footer/index.vue'
import ReviewInbox from './review-inbox/index.vue'
import DeckGrid from './deck-grid/index.vue'
import DeckGridSortOptions, { type SortOption } from './deck-grid/sort-options.vue'
import AudioReaderSection from './audio-reader-section.vue'

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
  if (err) notice.error(err.message)
})

function onToggleEditDecks() {
  editing_decks.value = !editing_decks.value
  emitSfx(editing_decks.value ? 'pop_up_pop' : 'pop_up_close')
}

const due_decks = computed(() => {
  return decks.value
    .filter((deck) => (deck.due_count ?? 0) > 0)
    .sort((a, b) => (b.due_count ?? 0) - (a.due_count ?? 0))
})
</script>

<template>
  <div
    data-testid="dashboard"
    class="grid grid-cols-[1fr] mxl:grid-cols-[345px_1fr] gap-x-15.5 gap-y-8 mxl:gap-y-0 px-(--page-px) pt-(--page-pt) pb-12 w-full max-w-229 mx-auto mxl:max-w-none mxl:mx-0"
  >
    <div
      data-testid="dashboard__left-column"
      class="flex flex-col gap-6 self-start mxl:sticky mxl:top-(--nav-height)"
    >
      <dashboard-actions-panel
        :due_decks="due_decks"
        :editing_decks="editing_decks"
        @toggle-edit-decks="onToggleEditDecks"
      />
    </div>

    <div data-testid="dashboard__right-column" class="flex flex-col gap-y-13 min-w-0">
      <dashboard-section v-if="due_decks.length > 0" :label="t('dashboard.deck-filter.due-label')">
        <review-inbox :due_decks="due_decks" :editing="editing_decks" />
      </dashboard-section>

      <dashboard-section :label="t('dashboard.deck-filter.all-label')">
        <template #subheader>
          <deck-grid-sort-options :selected="sort_by" @select="sort_by = $event" />
        </template>

        <deck-grid :decks="decks" :editing="editing_decks" />
      </dashboard-section>

      <audio-reader-section v-if="can.useAudioReader.value" />
    </div>

    <scroll-bar class="fixed right-4 top-(--nav-height) bottom-10 z-30" target="html" />

    <dashboard-mobile-footer
      :due_decks="due_decks"
      :editing_decks="editing_decks"
      @toggle-edit-decks="onToggleEditDecks"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useMemberDecksQuery } from '@/api/decks'
import { useNoticeStore } from '@/stores/notice-store'
import { useCan } from '@/composables/can'
import MemberSection from './member-section/index.vue'
import ReviewInbox from './review-inbox/index.vue'
import DeckGrid from './deck-grid/index.vue'
import AudioReaderSection from './audio-reader-section.vue'

const notice = useNoticeStore()
const can = useCan()

const { data: decks_data, error: decks_error } = useMemberDecksQuery()
const decks = computed(() => {
  return [...(decks_data.value ?? [])].sort((a, b) =>
    (a.created_at ?? '').localeCompare(b.created_at ?? '')
  )
})
watch(decks_error, (err) => {
  if (err) notice.error(err.message)
})

const due_decks = computed(() => {
  return decks.value.filter((deck) => (deck.due_count ?? 0) > 0)
})
</script>

<template>
  <div
    data-testid="dashboard"
    class="grid grid-cols-[1fr] md:grid-cols-[345px_1fr] gap-x-15.5 gap-y-8 md:gap-y-0 px-(--page-px) pt-(--page-pt) pb-12"
  >
    <div data-testid="dashboard__left-column" class="flex flex-col gap-6 self-start">
      <member-section :due_decks="due_decks" />
    </div>

    <div data-testid="dashboard__right-column" class="flex flex-col gap-y-24 min-w-0">
      <review-inbox v-if="due_decks.length > 0" :due_decks="due_decks" />

      <deck-grid :decks="decks" />

      <audio-reader-section v-if="can.useAudioReader.value" />
    </div>
  </div>
</template>

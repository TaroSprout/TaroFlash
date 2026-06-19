<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { memberCoverBindings } from '@/components/member/cover'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import ReviewInboxItem from './review-inbox-item.vue'
import { useStudyModal } from '@/composables/study-session/study-modal'

type ReviewInboxProps = {
  due_decks: Deck[]
}

const { due_decks } = defineProps<ReviewInboxProps>()

const { t } = useI18n()
const study_session = useStudyModal()

const header_bindings = computed(() => memberCoverBindings(undefined, { patternOpacity: '0.15' }))

const VISIBLE_COUNT = 3
const offset = ref(0)

const total_due = computed(() => due_decks.reduce((sum, d) => sum + (d.due_count ?? 0), 0))
const has_overflow = computed(() => due_decks.length > VISIBLE_COUNT)
const has_prev = computed(() => offset.value > 0)
const has_next = computed(() => offset.value + VISIBLE_COUNT < due_decks.length)
const visible_decks = computed(() => due_decks.slice(offset.value, offset.value + VISIBLE_COUNT))

function onItemClicked(deck: Deck) {
  study_session.start(deck)
}

function prev() {
  offset.value = Math.max(0, offset.value - 1)
}

function next() {
  offset.value = Math.min(due_decks.length - VISIBLE_COUNT, offset.value + 1)
}
</script>

<template>
  <div data-testid="review-inbox" class="w-full rounded-5 bg-brown-300">
    <div
      data-testid="review-inbox__header"
      v-bind="header_bindings"
      class="relative rounded-t-5 bg-(--theme-primary) px-6 pt-5 pb-10"
    >
      <h2
        data-testid="review-inbox__heading"
        class="text-xl font-semibold text-(--theme-on-primary)"
      >
        {{ t('review-inbox.cards-due-heading', total_due) }}
      </h2>
      <svg
        class="absolute bottom-0 left-0 w-full"
        viewBox="0 0 400 24"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0,24 L0,8 C80,0 120,16 200,8 C280,0 320,16 400,8 L400,24 Z"
          fill="var(--color-brown-300)"
        />
      </svg>
    </div>

    <div data-testid="review-inbox__body" class="px-5 pt-3 pb-5">
      <div data-testid="review-inbox__items" class="relative flex justify-center gap-3 py-2">
        <button
          v-if="has_overflow"
          data-testid="review-inbox__prev-btn"
          class="absolute -left-7 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-brown-100 shadow disabled:opacity-40"
          :disabled="!has_prev"
          @click="prev"
        >
          <ui-icon src="chevron-left" class="h-4 w-4" />
        </button>

        <review-inbox-item
          v-for="deck in visible_decks"
          :key="deck.id"
          :deck="deck"
          @click="onItemClicked(deck)"
        />

        <button
          v-if="has_overflow"
          data-testid="review-inbox__next-btn"
          class="absolute -right-7 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-brown-100 shadow disabled:opacity-40"
          :disabled="!has_next"
          @click="next"
        >
          <ui-icon src="chevron-right" class="h-4 w-4" />
        </button>
      </div>

      <div data-testid="review-inbox__actions" class="mt-4 flex justify-center">
        <ui-button size="lg">
          {{ t('review-inbox.study-all-button') }}
        </ui-button>
      </div>
    </div>
  </div>
</template>

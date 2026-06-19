<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { memberCoverBindings } from '@/components/member/cover'
import UiButton from '@/components/ui-kit/button.vue'
import ReviewInboxItem from './review-inbox-item.vue'
import { useStudyModal } from '@/composables/study-session/study-modal'
import {
  carouselBeforeEnter,
  carouselEnter,
  carouselLeave,
  type CarouselDirection
} from '@/utils/animations/inbox-carousel'

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
const visible_decks = computed(() => due_decks.slice(offset.value, offset.value + VISIBLE_COUNT))

const direction = ref<CarouselDirection>('next')

function onItemClicked(deck: Deck) {
  study_session.start(deck)
}

function prev() {
  direction.value = 'prev'
  offset.value = offset.value > 0 ? offset.value - 1 : due_decks.length - VISIBLE_COUNT
}

function next() {
  direction.value = 'next'
  offset.value = offset.value + VISIBLE_COUNT < due_decks.length ? offset.value + 1 : 0
}

function onBeforeEnter(el: Element) {
  carouselBeforeEnter(direction.value)(el)
}

function onEnter(el: Element, done: () => void) {
  carouselEnter(direction.value)(el, done)
}

function onLeave(el: Element, done: () => void) {
  carouselLeave(direction.value)(el, done)
}
</script>

<template>
  <div data-testid="review-inbox" class="w-full rounded-8 bg-brown-300 dark:bg-stone-900">
    <div
      data-testid="review-inbox__header"
      v-bind="header_bindings"
      class="rounded-t-8 bg-(--theme-primary) px-6 pt-8 pb-10 wave-bottom-[32px]"
    >
      <h2
        data-testid="review-inbox__heading"
        class="text-3xl text-center font-semibold text-(--theme-on-primary)"
      >
        {{ t('review-inbox.cards-due-heading', total_due) }}
      </h2>
    </div>

    <div data-testid="review-inbox__body" class="px-5 pt-3 pb-5">
      <div data-testid="review-inbox__items" class="relative flex justify-center py-2">
        <ui-button
          v-if="has_overflow"
          data-testid="review-inbox__prev-btn"
          icon-left="chevron-left"
          icon-only
          data-theme="brown-50"
          class="absolute! -left-9 top-1/2 -translate-y-1/2 z-20"
          :sfx="{ press: 'ui.snappy_button_5' }"
          @click="prev"
        >
          {{ t('review-inbox.prev-button') }}
        </ui-button>

        <transition-group
          :css="false"
          tag="div"
          move-class="inbox-carousel-move"
          class="relative flex gap-1"
          @before-enter="onBeforeEnter"
          @enter="onEnter"
          @leave="onLeave"
        >
          <review-inbox-item
            v-for="deck in visible_decks"
            :key="deck.id"
            :deck="deck"
            @click="onItemClicked(deck)"
          />
        </transition-group>

        <ui-button
          v-if="has_overflow"
          data-testid="review-inbox__next-btn"
          icon-left="chevron-right"
          icon-only
          data-theme="brown-50"
          class="absolute! -right-9 top-1/2 -translate-y-1/2 z-20"
          :sfx="{ press: 'ui.snappy_button_5' }"
          @click="next"
        >
          {{ t('review-inbox.next-button') }}
        </ui-button>
      </div>

      <div data-testid="review-inbox__actions" class="mt-4">
        <ui-button
          size="xl"
          icon-left="book-flip-page"
          data-theme="brown-100"
          data-theme-dark="stone-700"
          class="w-full!"
        >
          {{ t('review-inbox.study-all-button') }}
        </ui-button>
      </div>
    </div>
  </div>
</template>

<style>
.inbox-carousel-move {
  transition: transform 0.25s ease-out;
}
</style>

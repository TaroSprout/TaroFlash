<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import ReviewInboxItem from './review-inbox-item.vue'
import { useStudyModal } from '@/composables/study-session/study-modal'
import {
  carouselReset,
  carouselSlide,
  type CarouselDirection
} from '@/utils/animations/inbox-carousel'

type ReviewInboxProps = {
  due_decks: Deck[]
}

const { due_decks } = defineProps<ReviewInboxProps>()

const { t } = useI18n()
const study_session = useStudyModal()

const VISIBLE_COUNT = 3
const offset = ref(0)

const has_overflow = computed(() => due_decks.length > VISIBLE_COUNT)

const study_button_key = computed(() => {
  if (due_decks.length === 1) return 'review-inbox.study-button'
  if (due_decks.length === 2) return 'review-inbox.study-both-button'
  return 'review-inbox.study-all-button'
})

const tape = ref<Deck[]>([])
const tape_el = ref<HTMLElement | null>(null)
const is_animating = ref(false)

function deckAt(base: number, i: number) {
  const n = due_decks.length
  return due_decks[(((base + i) % n) + n) % n]
}

function tapeFor(base: number): Deck[] {
  const count = Math.min(VISIBLE_COUNT, due_decks.length)
  if (!count) return []
  return Array.from({ length: count }, (_, i) => deckAt(base, i))
}

watch(
  () => due_decks,
  () => {
    tape.value = tapeFor(offset.value)
  },
  { immediate: true }
)

function onItemClicked(deck: Deck) {
  study_session.start(deck)
}

async function navigate(dir: CarouselDirection) {
  if (is_animating.value || !tape_el.value || !due_decks.length) return
  is_animating.value = true

  const n = due_decks.length
  const new_offset = dir === 'next' ? (offset.value + 1) % n : (offset.value - 1 + n) % n
  const step_px = (tape_el.value.children[0] as HTMLElement)?.offsetWidth + 4

  const clip = tape_el.value.parentElement as HTMLElement
  const body = clip.closest('[data-testid="review-inbox__body"]') as HTMLElement
  clip.style.width = `${clip.offsetWidth}px`
  body.style.overflowX = 'hidden'

  if (dir === 'next') {
    tape.value = [...tape.value, deckAt(offset.value, VISIBLE_COUNT)]
  } else {
    tape.value = [deckAt(offset.value, -1), ...tape.value]
  }

  await nextTick()
  await carouselSlide(tape_el.value, dir, step_px)

  offset.value = new_offset
  tape.value = tapeFor(new_offset)
  carouselReset(tape_el.value)
  await nextTick()
  clip.style.width = ''
  body.style.overflowX = ''
  is_animating.value = false
}

function prev() {
  navigate('prev')
}

function next() {
  navigate('next')
}
</script>

<template>
  <div
    data-testid="review-inbox"
    class="w-full rounded-8 bg-brown-300 dark:bg-stone-900 select-none"
  >
    <div data-testid="review-inbox__body" class="pt-3 pb-5">
      <div data-testid="review-inbox__items" class="flex justify-center py-2">
        <div class="relative">
          <ui-button
            v-if="has_overflow"
            data-testid="review-inbox__prev-btn"
            icon-left="chevron-left"
            icon-only
            data-theme="brown-50"
            class="absolute! -left-4 top-1/2 -translate-y-1/2 z-20"
            :sfx="{ press: 'snappy_button_5' }"
            @press="prev"
          >
            {{ t('review-inbox.prev-button') }}
          </ui-button>

          <div class="overflow-hidden p-3">
            <div ref="tape_el" data-testid="review-inbox__tape" class="flex gap-1">
              <review-inbox-item
                v-for="deck in tape"
                :key="deck.id"
                :deck="deck"
                @click="onItemClicked(deck)"
              />
            </div>
          </div>

          <ui-button
            v-if="has_overflow"
            data-testid="review-inbox__next-btn"
            icon-left="chevron-right"
            icon-only
            data-theme="brown-50"
            class="absolute! -right-4 top-1/2 -translate-y-1/2 z-20"
            :sfx="{ press: 'snappy_button_5' }"
            @press="next"
          >
            {{ t('review-inbox.next-button') }}
          </ui-button>
        </div>
      </div>

      <div data-testid="review-inbox__actions" class="mt-1 px-3">
        <ui-button
          size="xl"
          icon-left="book-flip-page"
          data-theme="brown-100"
          data-theme-dark="stone-700"
          class="w-full!"
          @press="onItemClicked(due_decks[0])"
        >
          {{ t(study_button_key) }}
        </ui-button>
      </div>
    </div>
  </div>
</template>

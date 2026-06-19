<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { memberCoverBindings } from '@/components/member/cover'
import UiButton from '@/components/ui-kit/button.vue'
import ReviewInboxItem from './review-inbox-item.vue'
import { useStudyModal } from '@/composables/study-session/study-modal'
import { carouselSlide, type CarouselDirection } from '@/utils/animations/inbox-carousel'

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

const tape = ref<Deck[]>([])
const tape_el = ref<HTMLElement | null>(null)
const is_animating = ref(false)

watch(
  () => due_decks,
  (decks) => {
    tape.value = decks.slice(offset.value, offset.value + VISIBLE_COUNT)
  },
  { immediate: true }
)

function onItemClicked(deck: Deck) {
  study_session.start(deck)
}

async function navigate(dir: CarouselDirection) {
  if (is_animating.value || !tape_el.value) return
  is_animating.value = true

  const new_offset =
    dir === 'next'
      ? offset.value + VISIBLE_COUNT < due_decks.length
        ? offset.value + 1
        : 0
      : offset.value > 0
        ? offset.value - 1
        : due_decks.length - VISIBLE_COUNT

  const step_px = (tape_el.value.children[0] as HTMLElement)?.offsetWidth + 4

  if (dir === 'next') {
    tape.value = [...tape.value, due_decks[new_offset + VISIBLE_COUNT - 1]]
  } else {
    tape.value = [due_decks[new_offset], ...tape.value]
  }

  await nextTick()
  await carouselSlide(tape_el.value, dir, step_px)

  offset.value = new_offset
  tape.value = due_decks.slice(new_offset, new_offset + VISIBLE_COUNT)
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

        <div class="overflow-hidden py-1.5 -my-1.5 px-1.5 -mx-1.5">
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

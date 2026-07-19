<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTranslateTermMutation, EdgeFunctionError, type TranslationResult } from '@/api/lessons'
import UiButton from '@/components/ui-kit/button.vue'
import UiDivider from '@/components/ui-kit/divider.vue'
import UiTag from '@/components/ui-kit/tag.vue'
import AddCardControl from './add-card-control.vue'
import AddCardPanel from './add-card-panel.vue'
import { cardSlideEnter, cardSlideLeave, type SlideDirection } from '@/utils/animations/card-slide'

type AddCardDraft = { front: string; back: string; note: string; deck_id: number | null }

const DIFFICULTY_TIERS = [
  {
    max: 2,
    key: 'audio-reader.popover.difficulty-beginner',
    theme: 'green-400',
    theme_dark: 'green-600'
  },
  {
    max: 4,
    key: 'audio-reader.popover.difficulty-elementary',
    theme: 'green-400',
    theme_dark: 'green-600'
  },
  {
    max: 6,
    key: 'audio-reader.popover.difficulty-intermediate',
    theme: 'yellow-500',
    theme_dark: 'yellow-700'
  },
  {
    max: 8,
    key: 'audio-reader.popover.difficulty-advanced',
    theme: 'red-500',
    theme_dark: 'red-600'
  },
  {
    max: 10,
    key: 'audio-reader.popover.difficulty-expert',
    theme: 'red-500',
    theme_dark: 'red-600'
  }
]

const {
  term,
  sentence,
  target_lang,
  existing_decks = [],
  show_back = false
} = defineProps<{
  term: string
  sentence: string
  target_lang: string
  // Decks already holding this term, forwarded to the add-card control.
  existing_decks?: number[]
  show_back?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'back'): void
  (e: 'play-from-here'): void
  (e: 'play-word'): void
}>()

const { t } = useI18n()
const translate = useTranslateTermMutation()

const result = ref<TranslationResult | null>(null)
const is_loading = ref(false)
const error_key = ref<string | null>(null)
const adding = ref<AddCardDraft | null>(null)
// Opening the panel pushes left; cancelling reverses so the term slides back in.
const slide_direction = ref<SlideDirection>('forward')
// Clip the face strip only while it slides — at rest the buttons' tap animations
// need to overflow the card.
const sliding = ref(false)

const difficulty_tier = computed(() => {
  const d = result.value?.difficulty
  if (d == null) return null
  return DIFFICULTY_TIERS.find((t) => d <= t.max) ?? DIFFICULTY_TIERS.at(-1)!
})

async function fetchTranslation() {
  result.value = null
  error_key.value = null
  is_loading.value = true
  try {
    result.value = await translate.mutateAsync({ term, sentence, target_lang })
  } catch (error) {
    error_key.value =
      error instanceof EdgeFunctionError && error.code === 'output_truncated'
        ? 'audio-reader.popover.too-long-error'
        : 'audio-reader.popover.error'
  } finally {
    is_loading.value = false
  }
}

// Slide the add-card panel over the translation, pre-filled with the term and
// its translation. The panel handles the save; closing the term is left to its
// `saved`/`cancel` outcomes.
function onAddCard(deck_id: number | null) {
  if (!result.value) return

  const { translation, reading, description } = result.value
  const back = reading ? `${translation}\n\n${reading}` : translation

  slide_direction.value = 'forward'
  adding.value = { front: term, back, note: description, deck_id }
}

// Cancelling reverses the push so the term card slides back in. Saving closes
// the whole popover instead — the card is confirmed by its own toast.
function returnToTermCard() {
  slide_direction.value = 'back'
  adding.value = null
}

function onSlideEnter(el: Element, done: () => void) {
  sliding.value = true
  cardSlideEnter(slide_direction.value)(el, done)
}

function onSlideLeave(el: Element, done: () => void) {
  sliding.value = true
  cardSlideLeave(slide_direction.value)(el, done)
}

function onSlideAfterEnter() {
  sliding.value = false
}

// The card only mounts while a term is showing, so fetch on mount and whenever
// the term changes underneath it — an empty term (punctuation-only) never fetches.
watch(
  () => term,
  (current) => {
    if (current) fetchTranslation()
  },
  { immediate: true }
)
</script>

<template>
  <div
    data-testid="term-card"
    class="relative [--skeleton-sheen:var(--color-brown-200)] dark:[--skeleton-sheen:var(--color-brown-500)]"
    :class="{ 'overflow-hidden': sliding }"
  >
    <transition
      :css="false"
      @enter="onSlideEnter"
      @leave="onSlideLeave"
      @after-enter="onSlideAfterEnter"
    >
      <div v-if="!adding" key="term" data-testid="term-card__face" class="flex flex-col">
        <div
          v-if="show_back"
          data-testid="term-card__controls"
          class="mb-8 flex items-center justify-between gap-3"
        >
          <ui-button
            neutral
            data-testid="term-card__back"
            icon-left="close"
            icon-only
            size="base"
            play-on-tap
            :sfx="{ press: 'pop_up_close' }"
            @press="emit('back')"
          >
            {{ t('audio-reader.popover.close-button') }}
          </ui-button>

          <add-card-control :disabled="!result" :existing_decks="existing_decks" @add="onAddCard" />
        </div>

        <header
          data-testid="term-card__header"
          class="flex items-start gap-3"
          :class="show_back ? 'justify-center' : 'justify-between'"
        >
          <div data-testid="term-card__term-group" class="flex min-w-0 items-center gap-2">
            <span
              data-testid="term-card__term"
              class="text-7xl leading-tight wrap-break-word text-ink"
              :class="{ 'text-center': show_back }"
            >
              {{ term }}
            </span>

            <ui-button
              neutral
              v-if="!show_back"
              data-testid="term-card__play-word"
              class="shrink-0"
              icon-left="play"
              icon-only
              size="sm"
              @press="emit('play-word')"
            >
              {{ t('audio-reader.popover.play-word-button') }}
            </ui-button>
          </div>

          <template v-if="!show_back">
            <add-card-control v-if="result" :existing_decks="existing_decks" @add="onAddCard" />

            <ui-button
              neutral
              v-else
              data-testid="term-card__close"
              icon-left="close"
              icon-only
              size="sm"
              @press="emit('close')"
            >
              {{ t('audio-reader.popover.close-button') }}
            </ui-button>
          </template>
        </header>

        <div
          data-testid="term-card__reading"
          class="mt-1 flex min-h-7 flex-wrap items-center gap-2"
          :class="{ 'justify-center': show_back }"
        >
          <span v-if="result?.reading" class="text-base text-ink">
            {{ result.reading }}
          </span>

          <span
            v-else-if="is_loading"
            class="term-card__skeleton h-4 w-24 rounded-2 bg-brown-500 dark:bg-brown-500"
          />
        </div>

        <ui-divider class="my-3">
          <template #start>
            <span class="shrink-0 text-ink-muted">{{
              t('audio-reader.popover.definition-label')
            }}</span>
          </template>

          <template #end>
            <ui-tag
              v-if="difficulty_tier"
              :data-theme="difficulty_tier.theme"
              :data-theme-dark="difficulty_tier.theme_dark"
              class="shrink-0 bgx-diagonal-stripes"
              >{{ t(difficulty_tier.key) }}</ui-tag
            >
          </template>
        </ui-divider>

        <div data-testid="term-card__body" class="flex min-h-18 flex-col">
          <div
            v-if="is_loading"
            data-testid="term-card__loading"
            class="flex flex-col gap-2"
            aria-busy="true"
            :aria-label="t('audio-reader.popover.loading')"
          >
            <span class="term-card__skeleton h-6 w-3/5 rounded-2 bg-brown-500 dark:bg-brown-500" />
            <span class="term-card__skeleton h-4 w-full rounded-2 bg-brown-500 dark:bg-brown-500" />
            <span class="term-card__skeleton h-4 w-4/5 rounded-2 bg-brown-500 dark:bg-brown-500" />
          </div>

          <p
            v-else-if="error_key"
            data-testid="term-card__error"
            class="text-red-500 dark:text-red-400"
          >
            {{ t(error_key) }}
          </p>

          <div v-else-if="result" data-testid="term-card__result" class="flex flex-col gap-1">
            <p
              data-testid="term-card__translation"
              class="text-3xl text-brown-700 capitalize dark:text-brown-200"
            >
              {{ result.translation }}
            </p>
            <p
              v-if="result.description"
              data-testid="term-card__description"
              class="text-base text-ink"
            >
              {{ result.description }}
            </p>
          </div>
        </div>

        <footer data-testid="term-card__footer" class="mt-4 flex">
          <ui-button
            neutral
            data-testid="term-card__play-from-here"
            icon-left="play"
            size="xl"
            full-width
            play-on-tap
            :tap-animate="false"
            :sfx="{ press: 'snappy_button_3' }"
            @press="emit('play-from-here')"
          >
            {{ t('audio-reader.popover.play-from-here-button') }}
          </ui-button>
        </footer>
      </div>

      <add-card-panel
        v-else
        key="add"
        :front="adding.front"
        :back="adding.back"
        :note="adding.note"
        :deck_id="adding.deck_id"
        @cancel="returnToTermCard"
        @saved="emit('close')"
      />
    </transition>
  </div>
</template>

<style>
.term-card__skeleton {
  position: relative;
  overflow: hidden;
}

/* A light gradient sweeps L→R across each bar; staggered so the lines cascade.
   Gated behind the reduce-animations toggle — bars sit static when it's on. */
body:not(.animation-safe) .term-card__skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, var(--skeleton-sheen), transparent);
  animation: term-card-skeleton-sweep 1.4s ease-in-out infinite;
}

body:not(.animation-safe) .term-card__skeleton:nth-child(2)::after {
  animation-delay: 0.1s;
}

body:not(.animation-safe) .term-card__skeleton:nth-child(3)::after {
  animation-delay: 0.2s;
}

@keyframes term-card-skeleton-sweep {
  to {
    transform: translateX(100%);
  }
}
</style>

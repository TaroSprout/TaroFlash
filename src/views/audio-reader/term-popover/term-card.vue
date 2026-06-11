<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTranslateTermMutation, EdgeFunctionError, type TranslationResult } from '@/api/lessons'
import UiButton from '@/components/ui-kit/button.vue'
import UiDivider from '@/components/ui-kit/divider.vue'
import UiTag from '@/components/ui-kit/tag.vue'
import AddCardControl from './add-card-control.vue'
import AddCardPanel from './add-card-panel.vue'
import { cardSlideEnter, cardSlideLeave, type SlideDirection } from '@/utils/animations/card-slide'

type AddCardDraft = { front: string; back: string; deck_id: number | null }

const {
  term,
  sentence,
  target_lang,
  show_back = false
} = defineProps<{
  term: string
  sentence: string
  target_lang: string
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

  slide_direction.value = 'forward'
  adding.value = { front: term, back: result.value.translation, deck_id }
}

// Saving dismisses the whole term (back to the toolbar on mobile); cancelling
// reverses the push so the translation slides back in.
function onPanelSaved() {
  emit('close')
}

function onPanelCancel() {
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
    class="relative [--skeleton-sheen:var(--color-brown-200)] dark:[--skeleton-sheen:var(--color-grey-400)]"
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
            data-testid="term-card__back"
            data-theme="brown-100"
            data-theme-dark="stone-900"
            icon-left="arrow-back"
            icon-only
            size="base"
            play-on-tap
            :sfx="{ click: 'ui.snappy_button_5' }"
            @click="emit('back')"
          >
            {{ t('audio-reader.popover.back-button') }}
          </ui-button>

          <add-card-control :disabled="!result" @add="onAddCard" />
        </div>

        <header
          data-testid="term-card__header"
          class="flex items-start gap-3"
          :class="show_back ? 'justify-center' : 'justify-between'"
        >
          <div data-testid="term-card__term-group" class="flex min-w-0 items-center gap-2">
            <span
              data-testid="term-card__term"
              class="text-7xl leading-tight wrap-break-word text-brown-700 dark:text-brown-200"
              :class="{ 'text-center': show_back }"
            >
              {{ term }}
            </span>

            <ui-button
              v-if="!show_back"
              data-testid="term-card__play-word"
              data-theme="grey-400"
              class="shrink-0"
              icon-left="play"
              icon-only
              size="sm"
              @click="emit('play-word')"
            >
              {{ t('audio-reader.popover.play-word-button') }}
            </ui-button>
          </div>

          <template v-if="!show_back">
            <add-card-control v-if="result" @add="onAddCard" />

            <ui-button
              v-else
              data-testid="term-card__close"
              data-theme="grey-400"
              icon-left="close"
              icon-only
              size="sm"
              @click="emit('close')"
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
          <span v-if="result?.reading" class="text-base text-brown-700 dark:text-grey-400">
            {{ result.reading }}
          </span>

          <span
            v-else-if="is_loading"
            class="term-card__skeleton h-4 w-24 rounded-2 bg-brown-500 dark:bg-grey-500"
          />
        </div>

        <ui-divider class="my-3">
          <template #start>
            <span class="shrink-0 text-brown-500">{{
              t('audio-reader.popover.definition-label')
            }}</span>
          </template>

          <template #end>
            <ui-tag
              v-if="result?.pos"
              data-theme="green-400"
              class="shrink-0 bgx-diagonal-stripes"
              >{{ result.pos }}</ui-tag
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
            <span class="term-card__skeleton h-6 w-3/5 rounded-2 bg-brown-500 dark:bg-grey-500" />
            <span class="term-card__skeleton h-4 w-full rounded-2 bg-brown-500 dark:bg-grey-500" />
            <span class="term-card__skeleton h-4 w-4/5 rounded-2 bg-brown-500 dark:bg-grey-500" />
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
              class="text-base text-brown-700 dark:text-grey-300"
            >
              {{ result.description }}
            </p>
          </div>
        </div>

        <footer data-testid="term-card__footer" class="mt-4 flex">
          <ui-button
            data-testid="term-card__play-from-here"
            data-theme="brown-100"
            data-theme-dark="stone-900"
            icon-left="play"
            size="xl"
            full-width
            play-on-tap
            :sfx="{ click: 'ui.snappy_button_3' }"
            @click="emit('play-from-here')"
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
        :deck_id="adding.deck_id"
        @cancel="onPanelCancel"
        @saved="onPanelSaved"
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

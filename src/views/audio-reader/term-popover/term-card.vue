<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTranslateTermMutation, EdgeFunctionError, type TranslationResult } from '@/api/lessons'
import UiButton from '@/components/ui-kit/button.vue'
import UiDivider from '@/components/ui-kit/divider.vue'
import UiTag from '@/components/ui-kit/tag.vue'
import { useAddCardModal } from '@/composables/modals/use-add-card-modal'

const { term, sentence, target_lang } = defineProps<{
  term: string
  sentence: string
  target_lang: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { t } = useI18n()
const translate = useTranslateTermMutation()
const add_card_modal = useAddCardModal()

const result = ref<TranslationResult | null>(null)
const is_loading = ref(false)
const error_key = ref<string | null>(null)

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

// Hand the translation off to the add-card modal and dismiss the popover — the
// modal lives in the global stack, so closing the popover here doesn't unmount it.
function onAddCard(translation: string) {
  add_card_modal.open(term, translation)
  emit('close')
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
  <div data-testid="term-card" class="flex flex-col">
    <header data-testid="term-card__header" class="flex items-start justify-between gap-3">
      <span
        data-testid="term-card__term"
        class="text-6xl leading-tight wrap-break-word text-brown-700 dark:text-brown-200"
      >
        {{ term }}
      </span>
      <ui-button
        data-testid="term-card__close"
        data-theme="grey-400"
        icon-left="close"
        icon-only
        size="sm"
        @click="emit('close')"
      >
        {{ t('audio-reader.popover.close-button') }}
      </ui-button>
    </header>

    <div
      v-if="result && (result.reading || result.pos)"
      data-testid="term-card__reading"
      class="mt-1 flex flex-wrap items-center gap-2"
    >
      <span v-if="result.reading" class="text-base text-brown-700 dark:text-grey-400">
        {{ result.reading }}
      </span>
      <ui-tag v-if="result.pos" data-theme="green-400" class="bgx-diagonal-stripes">{{
        result.pos
      }}</ui-tag>
    </div>

    <ui-divider class="my-3" :label="t('audio-reader.popover.definition-label')" />

    <div
      v-if="is_loading"
      data-testid="term-card__loading"
      class="flex flex-col gap-2 [--skeleton-sheen:var(--color-brown-200)] dark:[--skeleton-sheen:var(--color-grey-400)]"
      aria-busy="true"
      :aria-label="t('audio-reader.popover.loading')"
    >
      <span class="term-card__skeleton h-6 w-3/5 rounded-2 bg-brown-500 dark:bg-grey-500" />
      <span class="term-card__skeleton h-4 w-full rounded-2 bg-brown-500 dark:bg-grey-500" />
      <span class="term-card__skeleton h-4 w-4/5 rounded-2 bg-brown-500 dark:bg-grey-500" />
    </div>

    <p v-else-if="error_key" data-testid="term-card__error" class="text-red-500 dark:text-red-400">
      {{ t(error_key) }}
    </p>

    <template v-else-if="result">
      <div data-testid="term-card__result" class="flex flex-col gap-1">
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

      <ui-button
        data-testid="term-card__add"
        data-theme="blue-500"
        data-theme-dark="blue-650"
        icon-left="add"
        size="sm"
        full-width
        class="mt-3"
        @click="onAddCard(result.translation)"
      >
        {{ t('audio-reader.popover.add-card-button') }}
      </ui-button>
    </template>
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
